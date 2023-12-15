import { createAuthenticator } from "@ft4/authentication";
import { hasAuthDescriptorFlags } from "@ft4/authentication/ft/key-handler";
import { createInMemoryFtKeyStore } from "@ft4/authentication/ft/key-stores/in-memory";
import {
  AuthDataService,
  KeyHandler,
  KeyStore,
} from "@ft4/authentication/types";
import { createInMemoryLoginKeyStore } from "./stores/in-memory";
import { LoginKeyStore } from "./stores/types";
import {
  AnySimpleRule,
  LoginConfigError,
  LoginConfigRules,
  LoginConfigSimpleRule,
  LoginManager,
  LoginOptions,
  Rules,
} from "./types";
import { createAuthDataService, createSession } from "@ft4/ft-session";
import { Connection } from "@ft4/types";
import {
  isRawRule,
  isNullRule,
  isSimpleRule,
  isLoginConfigSimpleRule,
} from "./type-predicates";
import { authDescriptorById } from "@ft4/accounts/account-queries";
import { createAccountObject } from "@ft4/accounts/account-query-functions";
import {
  AuthDescriptorRules,
  AuthDescriptorSimpleRule,
  FlagsType,
  RuleOperator,
  RuleVariable,
  createSingleSigAuthDescriptorRegistration,
  deriveAuthDescriptorId,
  gtv,
} from "@ft4/accounts/auth-descriptor";
import { getPubkey } from "@ft4/utils/index";
import { rulesFromGtv } from "@ft4/accounts/auth-descriptor/gtv";

export * from "./types";
export { LoginKeyStore };

export function createLoginManager(
  connection: Connection,
  keyStore: KeyStore,
  loginKeyStore: LoginKeyStore | null = null,
): LoginManager {
  const usedLoginKeyStore = loginKeyStore || createInMemoryLoginKeyStore();

  return Object.freeze({
    login: async (loginOptions: LoginOptions) => {
      const account = createAccountObject(connection, loginOptions.accountId);

      // Get all auth descriptors that can be used with the provided key store
      const authDescriptors = await account.getAuthDescriptorsByParticipantId(
        keyStore.id,
      );

      // We need need an auth descriptor with admin flag in order to add a
      // disposable key
      const adminAuthDescriptor = authDescriptors.data.find((authDescriptor) =>
        authDescriptor.args.flags.includes(FlagsType.Account),
      );

      if (!adminAuthDescriptor) {
        throw new Error(
          `Admin auth descriptor does not exist for provided key store <${keyStore.id.toString(
            "hex",
          )}>`,
        );
      }

      let disposableKeyHandlers: KeyHandler[] = [];

      const authDataService = createAuthDataService(connection);
      // Get list of flags that will be added to new auth descriptor
      const config = await getFlagsAndRules(authDataService, loginOptions);

      const keyPair = await usedLoginKeyStore.getKeyPair(account.id);

      // If disposable key pair exists in login key store for provided account id,
      // check if there are already auth descriptors with required flags.
      // If they already exist then it will be used instead of adding a new auth descriptor
      if (keyPair) {
        const disposableKeyStore = createInMemoryFtKeyStore(keyPair);
        const disposableAuthDescriptors =
          await account.getAuthDescriptorsByParticipantId(getPubkey(keyPair));
        disposableKeyHandlers = disposableAuthDescriptors.data
          // TODO: filter out expired auth descriptors
          .filter((authDescriptor) =>
            // If
            hasAuthDescriptorFlags(authDescriptor, config.flags),
          )
          .map((authDescriptor) =>
            disposableKeyStore.createKeyHandler(authDescriptor),
          );
      }

      // Key pair was not found in login key store,
      // or there are no auth descriptors that have required flags.
      // Add new auth descriptor.
      if (!disposableKeyHandlers.length) {
        const disposableKeyHandler = await addDisposableAuthDescriptor(
          connection,
          usedLoginKeyStore,
          account.id,
          keyStore.createKeyHandler(adminAuthDescriptor),
          config.flags,
          config.rules,
        );
        disposableKeyHandlers = [disposableKeyHandler];
      }

      // Initialize key handlers that correspond to master key store
      const masterKeyHandlers = authDescriptors.data.map((authDescriptor) =>
        keyStore.createKeyHandler(authDescriptor),
      );

      const authenticator = createAuthenticator(
        loginOptions.accountId,
        [...disposableKeyHandlers, ...masterKeyHandlers],
        authDataService,
      );

      return createSession(connection, authenticator);
    },
    logout: (accountId: Buffer) => {
      usedLoginKeyStore.clear(accountId);
    },
  });
}

/*
 * Returns auth flags and rules provided as option to login manager's `login` function,
 * or if they are not provided, the function uses config name to load login config from chain.
 * If configName is null or undefined too, then default login config will be loaded from chain.
 */
async function getFlagsAndRules(
  authDataService: AuthDataService,
  options: LoginOptions,
): Promise<{ flags: string[]; rules: AuthDescriptorRules }> {
  let flags: string[];
  let rules: AuthDescriptorRules;

  let currentHeight: number;
  const getBlockHeight = async () => {
    if (currentHeight === undefined) {
      const blocks = await authDataService.connection.client.getBlocksInfo(1);
      currentHeight = blocks[0].height;
    }
    return currentHeight;
  };

  if (options.config) {
    flags = options.config.flags;
    rules = await getRulesFromLoginConfig(options.config.rules, getBlockHeight);
  } else {
    const loginConfig = await authDataService.getLoginConfig(
      options.configName,
    );
    flags = loginConfig.flags;
    rules = await getRulesFromLoginConfig(loginConfig.rules, getBlockHeight);
  }
  return {
    flags,
    rules,
  };
}

/**
 * Takes as input some rules which could be formatted as login config rules or as auth
 * descriptor rules, and ensures they can be used in an auth descriptor.
 *
 * For example,
 *  null => null
 *  ["lt", "block_time", "{1000}"] => ["lt", "block_time", Date.now()+1000]
 *  ["lt", "op_count", "10"] => ["lt", "op_count", 10]
 *  ["and", loginRule1, authDescRule2] => ["and", authDescRule1, authDescRule2]
 *
 * @param rules Rules we need to ensure are Auth Descriptor rules
 * @param getBlockHeight a function which returns the current block height of the chain.
 * It allows caching
 * @returns The rules that will be used by the auth descriptor
 */
async function getRulesFromLoginConfig(
  rules: Rules,
  getBlockHeight: () => Promise<number>,
): Promise<AuthDescriptorRules> {
  if (isNullRule(rules)) {
    return null;
  } else if (isSimpleRule(rules)) {
    return ensureAuthDescriptorRule(rules, getBlockHeight);
  } else {
    const rulesWithoutAnd: AnySimpleRule[] = isRawRule(rules)
      ? <AnySimpleRule[]>rules.slice(1)
      : rules.rules;
    const simpleRules = rulesWithoutAnd.map((rule) =>
      ensureAuthDescriptorRule(rule, getBlockHeight),
    );

    const result: AuthDescriptorRules = {
      operator: "and",
      rules: await Promise.all(simpleRules),
    };

    return result;
  }
}

/**
 * Takes a login config simple rule and transforms it into an auth descriptor rule.
 * for example, ["lt", "block_time", "{1000}"] becomes ["lt", "block_time", Date.now()+1000]
 *
 * Only works with simple rules, so nothing that starts with ["and", ...] is supported
 *
 * @param rule the simple rule which we want to ensure is an auth descriptor rule
 * @param getBlockHeight a function that returns the current block height (with caching)
 * @returns the auth descriptor rule that corresponds to the rule passed in as argument
 */
async function ensureAuthDescriptorRule(
  rule: AnySimpleRule,
  getBlockHeight: () => Promise<number>,
): Promise<AuthDescriptorSimpleRule> {
  if (!isLoginConfigSimpleRule(rule)) {
    return isRawRule(rule)
      ? <AuthDescriptorSimpleRule>rulesFromGtv(rule)
      : rule;
  }

  const { operator, variable, value } = isRawRule(rule)
    ? { operator: rule[0], variable: rule[1], value: rule[2] }
    : rule;

  let finalValue: number;
  if (variable === RuleVariable.OpCount) {
    finalValue = parseInt(value);
  } else if (variable === RuleVariable.BlockTime) {
    const num = parseInt(value.replace(/[{}]/g, ""));
    finalValue = Date.now() + num;
  } else if (variable === RuleVariable.BlockHeight) {
    const blockHeight = await getBlockHeight();
    const num = parseInt(value.replace(/[{}]/g, ""));
    finalValue = blockHeight + num;
  } else {
    throw new LoginConfigError("unexpected variable: " + variable);
  }

  return {
    operator,
    variable,
    value: finalValue,
  };
}

async function addDisposableAuthDescriptor(
  connection: Connection,
  loginKeyStore: LoginKeyStore,
  accountId: Buffer,
  adminAuthHandler: KeyHandler,
  flags: string[],
  rules: AuthDescriptorRules,
): Promise<KeyHandler> {
  const authenticator = createAuthenticator(
    accountId,
    [adminAuthHandler],
    createAuthDataService(connection),
  );

  const session = createSession(connection, authenticator);

  const keyPair = await loginKeyStore.createKeyPair(accountId);
  const ks = createInMemoryFtKeyStore(keyPair);

  const registration = createSingleSigAuthDescriptorRegistration(
    flags,
    getPubkey(keyPair),
    rules,
  );

  await session.account.addAuthDescriptor(registration, keyPair);
  const ad = gtv.authDescriptorFromGtv(
    await connection.query(
      authDescriptorById(accountId, deriveAuthDescriptorId(registration)),
    ),
  );

  return ks.createKeyHandler(ad);
}

/*
 * Allows the user to specify a ttl value like this:
 * weeks(1)+days(3)
 * None of these functions care in any way about leap seconds and any other time adjustments
 * This means that when you define an auth descriptor with a rule that makes it expire after
 * 1 day, it will expire after exactly 24h, even if there has been a leap second during that
 * day, which means it will be off by a second (e.g. starts at 14:00:00 and expires the next
 * day at 13:59:59).
 */
export const minutes = (m: number) => m * 60000;
export const hours = (h: number) => h * minutes(60);
export const days = (d: number) => d * hours(24);
export const weeks = (w: number) => w * days(7);

export function ttlLoginRule(ttl: number): LoginConfigSimpleRule {
  return {
    operator: RuleOperator.LessThan,
    variable: RuleVariable.BlockTime,
    value: `{${ttl}}`,
  };
}

export function authDescriptorRuleToLoginConfigRule(
  rule: AuthDescriptorRules,
): LoginConfigRules {
  if (isNullRule(rule)) {
    return null;
  }

  const simpleRuleConversion = (rule: AuthDescriptorSimpleRule) => {
    return {
      ...rule,
      value:
        rule.variable === RuleVariable.OpCount
          ? "" + rule.value
          : `{${rule.value}}`,
    };
  };

  if (isSimpleRule(rule)) {
    return simpleRuleConversion(rule);
  } else {
    return {
      operator: rule.operator,
      rules: rule.rules.map(simpleRuleConversion),
    };
  }
}
