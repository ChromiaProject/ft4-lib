## Introduction

This library is written with TypeScript therefore it's all typed already but there is one more place where you would
want to have type safety - when calling operations and queries. Because of dynamic nature of Blockchains (especially
cross-chain stuff) this library by default accepts any string as query/operation name and any [GTV][1] serializable
value for arguments/parameters.

However, with some preparations we can add type safety here too!

What you'll get:
- warning when mistyping query/operation name + name suggestions from your IDE
- warning when parameter is mistyped, missing or wrong type + parameters name suggestions from your IDE

## Preparations

Prepare yourself types that look like this.

> It is important to use `type Name = {}` instead of `interface Name {}` - otherwise TypeScript will complain later!

See how you can add some comments for even better developer experience when using smart suggestions (depends on your
IDE). 

```typescript
type Queries = {
    /**
     * Returns registered user name
     */
    get_user_name: {
        params: {
            account_id: string;
        },
        return: string;
    }
}

type Operations = {
    /**
     * Registers an account
     */
    add_user: {
        params: [account_id: string, auth_id: string, username: string],
    }
}
```

## Queries

Import `TypedBlockchain` helper type, feed it with your queries and use the result to define a variable type when
assigning a value, in example:

```typescript
import type { TypedBlockchain } from "ft3-lib";

const blockchain: TypedBlockchain<Queries> = await new Postchain(nodeApiUrl).blockchain(brid);

// Example:
const name = await blockchain.query("get_user_name", { account_id: "abcd" });
//    ^ name is string
```

No need to typecast, no runtime overhead.

## Operations

This one is bit different. You need to import helper function, which you need to feed your operations definitions. As a
result you will get a class you need to use in replacement of `Operation` available directly from `ft3-lib`.

Create this type once and import it from your files where needed.

```typescript
import { createTypedOperation } from "ft3-lib";

const TOperation = createTypedOperation<Operations>();

// Example:
await blockchain.transactionBuilder()
    .add(new TOperation("add_user", "abcd", "zxcv", "Josh")) // <-- notice TOperation is used just like Operation
    .build([user1.keyPair.pubKey])
    .sign(user1.keyPair)
    .post();
```

## Protip

We suggest you to prepare a separate file with Queries & Operations definitions, type for blockchain and type for
operations:

```typescript
import { createTypedOperation } from "ft3-lib";
import type { TypedBlockchain } from "ft3-lib";

type Queries = {}; // fill in your queries
type Operations = {}; // fill in your queries

export type TBlockchain = TypedBlockchain<Queries>;
export const TOperation = createTypedOperation<Operations>();
```

and whenever you need one of these - import it from this file to avoid repetition.

[1]: https://rell.chromia.com/en/master/languageguide/types.html#gtv