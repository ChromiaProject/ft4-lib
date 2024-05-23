<script lang='ts'>
	import { createClient } from 'postchain-client';
	import Header from './Header.svelte';
	import { onMount } from 'svelte';
	import { connectionStore } from '$lib/stores';
	import { createConnection } from '@chromia/ft4';

	onMount(async ()=>{
		const cl = await createClient({
			nodeUrlPool: "http://localhost:7740",
			blockchainIid: 0,
		});
		const connection = createConnection(cl);
		connectionStore.set(connection)
	})
</script>

<div class="app">
	<Header />

	<main>
		<slot />
	</main>
</div>

<style>
	.app {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
	}

	main {
		flex: 1;
		display: flex;
		width: 100%;
		margin: 0 auto;
		box-sizing: border-box;
	}
</style>
