<script lang="ts">
	//@ts-ignore
    const api = globalThis.api

    import AppTitle from '@components/AppTitle.svelte'
    import PlaylistTitle from '@components/PlaylistTitle.svelte'
    import SearchBar from '@components/SearchBar.svelte'
    import Sidebar from '@components/Sidebar.svelte'
	import PlaylistBar from '@components/PlaylistBar.svelte'
    import ButtonBar from '@components/ButtonBar.svelte'
    import DetailsView from '@components/DetailsView.svelte'
    import ExtraDetailsView from '@components/ExtraDetailsView.svelte';
    


</script>


<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar/>
    <Sidebar/>
	<PlaylistBar/>
	<ButtonBar/>
    <div id="main-content">
        <DetailsView/>
        <ExtraDetailsView hide={false}/>
    </div>
	
</main>

<style>
    main#main-grid {
        display: grid;
        width: 100vw;
        height: 100vh;
        grid-template: max-content 1fr max-content / minmax(18rem, 25%) minmax(18rem, 25%) 1fr;
        grid-template-areas: "AppTitle PlaylistTitle SearchBar"
        "Sidebar PlaylistBar DetailsView"
        "Sidebar PlaylistBar ButtonBar";
    }
    #main-content {
        grid-area: DetailsView;
        display: flex;
        align-items: flex-start;
        justify-content: flex-end;
        flex-direction: column;
    }

</style>

