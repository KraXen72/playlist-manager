<script lang="ts">
    import AppTitle from '$components/AppTitle.svelte'
    import PlaylistTitle from '$components/PlaylistTitle.svelte'
    import SearchBar from '$components/SearchBar.svelte'
    import Sidebar from '$components/Sidebar.svelte'
	import PlaylistBar from '$components/PlaylistBar.svelte'
    import ButtonBar from '$components/ButtonBar.svelte'
    import DetailsView from '$components/DetailsView.svelte'
    import ExtraDetailsView from '$components/ExtraDetailsView.svelte';

    import { config, maindir, allSongs, allPlaylists, allSongsAndPlaylists } from './common/stores'
    import { onDestroy } from 'svelte';

    const api = window.api

    // @ts-ignore
    $config = api.initOrLoadConfig("config.json")

    const unsub = maindir.subscribe(val => {
        $allSongs = api.walker.songs($maindir, $config)
        /*console.log("fetched songs", $allSongs)*/ console.log("fetched songs")

        console.time('getting tags for songs')

        const tags = []
        for (let i = 0; i < $allSongs.length; i++) {
            const song = $allSongs[i];
            tags.push(
                new Promise(async (resolve) => {
                    const tag = await api.getEXTINF(song.fullpath, song.filename, true, false, false)
                    $allSongs[song.index].tag = tag
                    resolve("")
                })
            )
        }
        Promise.all(tags).then(() => {
            console.log("tagged all!")
            console.timeEnd('getting tags for songs')
        })
        
    })
    onDestroy(unsub)
</script>

<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar completeFrom={$allSongs}/>
    <Sidebar/>
	<PlaylistBar/>
	<ButtonBar/>
    <div id="main-content">
        <DetailsView/>
        <ExtraDetailsView hide={true}/>
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

        padding-right: 1rem;
        box-sizing: border-box;
    }
</style>

