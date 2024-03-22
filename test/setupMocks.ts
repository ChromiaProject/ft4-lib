/**
 * Mocking fetchExposedOperations for consistent test results.
 *
 * Why:
 * - `rell.get_app_structure` occasionally exhibits delays, especially in the test pipeline,
 *   due to its dynamic nature.
 * - Issues related to these delays are discussed in the Rell-dev Zulip stream, emphasizing
 *   the necessity for optimization. [Zulip Discussion](https://chromadev.zulipchat.com/#narrow/stream/144722-Rell-dev/topic/rell.2Eget_app_structure.20Timeouts)
 *
 * This mock provides a way to bypass these delays, ensuring fast and reliable test outcomes.
 */
jest.mock("@ft4/utils/exposed-operations", () => ({
  fetchExposedOperations: jest
    .fn()
    .mockResolvedValue(
      new Set([
        "nop",
        "ft4.add_auth_descriptor",
        "ft4.delete_all_auth_descriptors_exclude",
        "ft4.delete_auth_descriptor",
        "ft4.delete_auth_descriptors_for_signer",
        "ft4.admin.add_rate_limit_points",
        "ft4.admin.mint",
        "ft4.admin.register_account",
        "ft4.admin.register_asset",
        "ft4.burn",
        "ft4.transfer",
        "ft4.evm_auth",
        "ft4.ft_auth",
        "add_ad_to_account",
        "operation_without_auth_message_template",
        "register_account_test",
        "register_asset",
        "add_auth_descriptor_for_account",
        "test_auth",
        "test_authenticated_operation",
        "test_perform_large_transfer",
        "iccf_proof",
        "empty_op",
        "rejected_op",
        "ft4.admin.register_crosschain_asset",
        "ft4.crosschain.apply_transfer",
        "ft4.crosschain.init_transfer",
        "ft4.crosschain.complete_transfer",
        "ft4.renew_subscription",
      ]),
    ),
}));
