<script lang="ts">
    import AppTitle from '$components/AppTitle.svelte'
    import PlaylistTitle from '$components/PlaylistTitle.svelte'
    import SearchBar from '$components/SearchBar.svelte'
    import Sidebar from '$components/Sidebar.svelte'
	import PlaylistBar from '$components/PlaylistBar.svelte'
    import ButtonBar from '$components/ButtonBar.svelte'
    import DetailsView from '$components/DetailsView.svelte'
    import ExtraDetailsView from '$components/ExtraDetailsView.svelte';
    import CoverView from './components/CoverView.svelte';

    import { config, maindir, allSongs, detailsData, extraDetailsData, tagDB, allPlaylists, allSongsAndPlaylists, viewCoverPath, currPlaylist } from './common/stores'
    import { onDestroy } from 'svelte';

    const api = window.api


    $config = api.initOrLoadConfig("config.json")
    let searchDisabled = true
    let localTagDB = $tagDB

    console.log("mounted")
    const unsub = maindir.subscribe(val => {
            $allSongs = api.walker.songs($maindir, $config)
            console.log("fetched songs. checking if we have cached tags...")

            $allPlaylists = api.walker.playlists($maindir, $allSongs.length)
            //console.log($allPlaylists)

            $allSongsAndPlaylists = [...$allSongs, ...$allPlaylists]

            // ($allSongs.length > Object.keys($tagDB).length && Object.keys($tagDB).length > 0)
            localTagDB = api.initOrLoadConfig(`./db/${btoa($maindir)}.json`, {})

            //check if all songs have a cached tag already or nah.
            if ($allSongs.every(song => Object.keys(localTagDB).includes(song.filename))) {
                console.log(`all ${Object.keys(localTagDB).length} songs have cached tags.`)
                $tagDB = localTagDB
                searchDisabled = false
            } else {
                console.log("not all songs have cached tags. getting tags from songs...")
                console.time(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
                api.cacheTags($allSongs).then(val => {
                    localTagDB = val
                    api.saveConfig(`./db/${btoa($maindir)}.json`, localTagDB, true)
                    console.timeEnd(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
                    $tagDB = localTagDB
                    searchDisabled = false
                }).catch((e) => {console.error(e)})
            }

            window.addEventListener("message", (event) => {
                // event.source === window means the message is coming from the preload
                // script, as opposed to from an <iframe> or other source.
                if (event.source === window) {
                    const value = event.data?.purpose 
                    switch (value) {
                        //all of these are skipped because they are going to be handled elsewhere
                        case "cacheTagsProgress":
                            break;
                        default:
                            console.log("from preload:", event.data);
                            break;
                    }
                }
            });
        })
    onDestroy(unsub)

    let sidebarBinder: any;
    function _refreshSidebar() {
        console.log("refreshing in 2.5s")
        //TODO update to get length of the playlist or sumn
        setTimeout(() => {
            $allPlaylists = api.walker.playlists($maindir, $allSongs.length)
            $allSongsAndPlaylists = [...$allSongs, ...$allPlaylists]
            
            sidebarBinder.fetchPlaylists()
        }, 2500)
    }
</script>


<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar completeFrom={$allSongsAndPlaylists} disabled={searchDisabled}/>
    <Sidebar bind:this={sidebarBinder}/>
	<PlaylistBar/>
	<ButtonBar on:refresh={_refreshSidebar}/>
    <div id="main-content">
        {#if $viewCoverPath !== false}
            <CoverView src={$viewCoverPath}/>
        {/if}
        <DetailsView {...$detailsData}/>
        <ExtraDetailsView hide={true} data={$extraDetailsData}/>
    </div>
</main>

<div id="moremenu" class="hidden">
    <ul id="mm-ul">
        <li class="mm-li">Bruh</li>
    </ul>
</div>

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

