<script lang='ts'>
	import { evmKeyStore, connectionStore } from "$lib/stores";
	import { AuthFlag, createSingleSigAuthDescriptorRegistration, registerAccountAdmin, type Account } from "@chromia/ft4";
	import { encryption, newSignatureProvider } from "postchain-client";

	$: evmAddress = "0x" + $evmKeyStore?.id.toString("hex");
	$: ft4Address = ft4Account?.id.toString("hex");
	let ft4Account: Account | undefined = undefined;

	async function getAccountsForEvmAccount(account: string) {
		if (!$connectionStore) return undefined
		const accs = await $connectionStore.getAccountsBySigner(
			account.replace("0x", ""), 1);
		ft4Account = accs.data[0];
	}

	async function createFt4Account() {
		// Create an auth descriptor which is allowed to administrate the account
		const descriptor = createSingleSigAuthDescriptorRegistration(
			[AuthFlag.Account, AuthFlag.Transfer],
			$evmKeyStore!.id,
			null,
		);
	
		// Create an account using the auth descriptor
		// Note: Here we are using the admin method of creating an account, in a production system
		// you will want to use one of the register account strategies, or create your own
		await registerAccountAdmin(
			$connectionStore!.client,
			newSignatureProvider(
				encryption.makeKeyPair(
					"00CED79962D1150BF844CACB76310D4746C4426558A7FD9C827B30203DACC4CE"
				)
			),
			descriptor
		);
		getAccountsForEvmAccount(evmAddress)
	}
</script>

<svelte:head>
	<title>Metamask demo app</title>
	<meta name="description" content="FT4 Metamask demo app" />
</svelte:head>

<section>
	{#if !$evmKeyStore}
		<p>Please connect Metamask to see your accounts or register a new one</p>
	{:else}
		<h3 style:margin="0">EVM account:</h3>
		<button class='evm'
		   on:click={() => navigator.clipboard.writeText(evmAddress)}>
			{evmAddress}
		</button>
		{#await getAccountsForEvmAccount(evmAddress)}
			Loading FT4 account...
		{:then} 
			{#if ft4Account}
			<h3 style:margin="1rem 0 0 0">FT4 account:</h3>
			<button class='evm'
			   on:click={() => navigator.clipboard.writeText(ft4Address??'')}>
				{ft4Address}
			</button>
			{:else if $connectionStore === undefined}
				<p>There was an issue connecting to the blockchain</p>
				<p>Did you forget to start it? see the README for instructions</p>
			{:else}
				<button class="create" on:click={createFt4Account}>
					Create an FT4 account!
				</button>
			{/if}
		{/await}
	{/if}
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 1;
		background-image: linear-gradient(#ddd,#bbb);
		color: #222;
	}
	.evm {
		background-color: wheat;
		padding: 0.5rem;
		border-radius: 10rem;
		border: none;
		margin: 0.5rem
	}
	.create {
		margin: 1rem;
		padding: 0.5rem;
		font-size: 14pt;
		background-color: #222;
		color: #eee;
		border: none;
		border-radius: 0.5rem;
	}
</style>
