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

    import { config, maindir, allSongs, detailsData, extraDetailsData, tagDB, allPlaylists, allSongsAndPlaylists, viewCoverPath, playlistOnlyMode, currPlaylist } from './common/stores'
    import { onDestroy } from 'svelte';

    import { SvelteToast } from '@zerodevx/svelte-toast';
    import { toast } from '$common/toast'

    const api = window.api

    $config = api.initOrLoadConfig("config.json")
    let searchDisabled = true
    let localTagDB = $tagDB

    let sidebarBinder: any, 
        playlistBinder: any, 
        buttonBarBinder: any

    type RegenCustomEvent = { detail: SongItemData }

    // flow of regen (mayb optimize later)
    // Sidebar --- RegenCustomEvent ---> App.svelte
    // App: regenPlaylist(RegenCustomEvent) - generates the playlist files
    // App: setupAppStores(RegenCustomEvent) - re-initializes the app's stores
    // App: setupAppStores: regenPlaylistPart2(RegenCustomEvent) - loads playlist, save it and discard it

    /**
     * first part of regening playlist: generates new playlists and set ups app stores
    */
    async function regenPlaylist(event: RegenCustomEvent) {
        await sidebarBinder.generatePlaylists(false)
        _setupAppStores(event)
    }

    /** 
     * second part of regening playlist: load, save and discard the playlist
     * @param event a svelte CustomEvent. the detail is a SongItemData
     */
    function regenPlaylistPart2(event: RegenCustomEvent) {
        sidebarBinder.editPlaylist( event.detail, false )
        buttonBarBinder.savePlaylist( false )
        buttonBarBinder.discardPlaylist()
        $playlistOnlyMode.proposed = false

        console.timeEnd("> (regen) regened this playlist in: ")
        toast.success(`re-generated '${event.detail.album}'`)
        //refreshSidebar()
    }

    /** 
     * fully set up app stores by requesting them from the backend. 
     * should only happen when app is refreshed or playlist is regenerated
     * @param regen false if not regen, Event from regen custom event if true
    */
    function _setupAppStores(regen: RegenCustomEvent | false = false) {
        $allSongs = api.walker.songs($maindir, $config)
        console.log("fetched songs. checking if we have cached tags...")

        $allPlaylists = api.walker.playlists($maindir, $allSongs.length)
        //console.log($allPlaylists)

        $allSongsAndPlaylists = [...$allSongs, ...$allPlaylists]

        // ($allSongs.length > Object.keys($tagDB).length && Object.keys($tagDB).length > 0)
        localTagDB = api.initOrLoadConfig(`./db/${btoa($maindir)}.json`, {})

        //check if all songs have a cached tag already or nah.
        //TODO rewrite with array.some, fetch tags for the someS
        if ($allSongs.every(song => Object.keys(localTagDB).includes(song.filename))) {
            console.log(`all ${Object.keys(localTagDB).length} songs have cached tags.`)
            $tagDB = localTagDB
            searchDisabled = false

            if (regen !== false) regenPlaylistPart2(regen)
        } else {
            console.log("not all songs have cached tags. getting tags from songs...")
            console.time(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
            api.cacheTags($allSongs).then(val => {
                localTagDB = val
                api.saveConfig(`./db/${btoa($maindir)}.json`, localTagDB, true)
                console.timeEnd(`fetched tags for all ${Object.keys(localTagDB).length} songs`)
                $tagDB = localTagDB
                searchDisabled = false

                if (regen !== false) regenPlaylistPart2(regen)
            }).catch((e) => {console.error(e)})
        }
    }

    console.log("mounted")
    const unsub = maindir.subscribe(val => {
            _setupAppStores()

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

    function refreshSidebar() {
        $allPlaylists = api.walker.playlists($maindir, $allSongs.length)
        $allSongsAndPlaylists = [...$allSongs, ...$allPlaylists]
        
        sidebarBinder.fetchPlaylists()
    }

    const toastOptions = {
        duration: 2500,
        reversed: true
    }
</script>


<main id="main-grid">
    <AppTitle/>
    <PlaylistTitle/>
    <SearchBar completeFrom={$allSongsAndPlaylists} disabled={searchDisabled}/>
    <Sidebar 
        bind:this={sidebarBinder} 
        on:loadedPlaylist={playlistBinder.resetScrollPos} 
        on:regenPlaylist={ event => regenPlaylist(event) }
    />
	<PlaylistBar bind:this={playlistBinder} />
	<ButtonBar bind:this={buttonBarBinder} on:refresh={refreshSidebar}/>
    <div id="main-content">
        {#if $viewCoverPath !== false}
            <CoverView src={$viewCoverPath}/>
        {/if}
        <DetailsView {...$detailsData}/>
        <ExtraDetailsView hide={true} data={$extraDetailsData}/>
    </div>
    <SvelteToast options={toastOptions} />
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

