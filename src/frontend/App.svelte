
<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar/>
    <Sidebar/>
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

</style>

<script lang="ts">
    const api = globalThis.api

    import AppTitle from './components/AppTitle.svelte'
    import PlaylistTitle from './components/PlaylistTitle.svelte'
    import SearchBar from './components/SearchBar.svelte'
    import Sidebar from './components/Sidebar.svelte'

</script>