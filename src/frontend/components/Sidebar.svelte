<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
    import TextDivider from './TextDivider.svelte';
    import SongItem from './SongItem.svelte';
    import SongItemButton from './SongItemButton.svelte';

    import { config, maindir, allPlaylists, playlistOnlyMode, changesSaved, allSongsAndPlaylists, currPlaylist, playlistName } from '$common/stores'
    import { onDestroy, tick, createEventDispatcher } from 'svelte'
    import { getExtOrFn } from '$rblib/esm/lib';

    const api = window.api
    const dispatch = createEventDispatcher()

    let sidebarPlaylists: SongItemData[] = []

    const blacklist = $config.ignore
    const pomExplanation = "playlist-only mode: make a combined playlist out of more playlists that later can be easily refreshed/regenerated"
    const regenExplanation = "re-make / update: generate this playlist again if you added new songs or removed some"

    function _matchPlaylistFromFullpath(fullpath: string) {
        return $allPlaylists.find(playlist => playlist.fullpath === fullpath)
    }
    function _deleteGeneratedPlaylists() {
        api.deleteGeneratedPlaylists($maindir, $config)
    }

    /**
     * delete comPlaylists entries for playlists that don't exist
    */
    export function validateComPlaylists() {
        const names = Object.keys($config.comPlaylists)
        let statuses = api.walker.validate(names)
        statuses.forEach(path => {
            if (path.status === false) {
                delete $config.comPlaylists[path.path]
            }
        })
        api.saveConfig("./config.json", $config, false, "reloading sidebar")
    }

    export function fetchPlaylists() {
        validateComPlaylists()
        sidebarPlaylists = api.walker.editablePlaylists($maindir).map((key: string)  => {
            let fullpath = `${$maindir}${api.slash}${key}`
            let isCom = Object.keys($config.comPlaylists).includes(fullpath)
            let ASData = _matchPlaylistFromFullpath(fullpath)
            //console.log("asdata: ", ASData)

            const parts = key.split(api.slash)
            const item: SongItemData = {
                title: getExtOrFn(parts[parts.length - 1]).fn,
                artist: `${typeof ASData?.songs.length !== "undefined" ? ASData?.songs.length :"--"} Songs`,
                filename: key,
                album: key,
                bold: true,
                nocover: true, //TODO nice playlist covers like in oto music
                allSongsIndex: ASData?.index ?? -1,
                comPlaylist: isCom
            }
            return item
        })
    }

    async function _generatePlaylists() {
        if (!genDisabled) {
            genDisabled = true
            await api.gen($maindir, blacklist, $config)
            genDisabled = false
            return "success"
        } else {
            console.error("already generating, don't spam")
            return "wait"
        }
    }

    /**
     * load playlist into playlistBar
     * @param data the songitem data in SidebarPlaylists
     * @param doTick wether to wait for svelte to render an empty playlist bar. default is true
    */
    function _editPlaylist(data: SongItemData, doTick = true) {
        const ASData = $allSongsAndPlaylists[data.allSongsIndex] as PlaylistSongItem
        //console.log(ASData, "isCom:", data.comPlaylist)

        async function loadPlaylist() {

            $playlistName = data.title
            if (!data.comPlaylist) {
                const songsInPlaylist: SongItemPlus[] = []

                for (let i = 0; i < ASData.songs.length; i++) {
                    const song = ASData.songs[i];
                    
                    const fullpath = [ $maindir, ...song.split("/") ].join(api.slash)
                    const songObj = $allSongsAndPlaylists.find(item => item.fullpath === fullpath) ?? "notfound"

                    if (songObj !== "notfound") songsInPlaylist.push(songObj)
                }
                
                $currPlaylist  = []
                if (doTick) await tick();
                $currPlaylist = songsInPlaylist

            } else {
                const consistsOf: PlaylistSongItem[] = []

                $config.comPlaylists[ASData.fullpath].forEach(playlist => {
                    const result = _matchPlaylistFromFullpath(playlist.fullpath)

                    if (typeof result !== "undefined") consistsOf.push(result)
                })

                $currPlaylist  = []
                if (doTick) await tick();
                $playlistOnlyMode.proposed = true
                $currPlaylist = consistsOf
                
            }

            $changesSaved = true
            dispatch("loadedPlaylist") //for the playlistBar to reset Scroll pos
        }

        if ($changesSaved && !$playlistOnlyMode.real) {
            loadPlaylist()
        } else {
            //changes are saved but i'm still in playlist-only mode
            if ($changesSaved && $playlistOnlyMode.real) {
                $playlistOnlyMode.proposed = false
                loadPlaylist()
            } else if (!$changesSaved) { //changes are not saved. confirm discard and exit playlist-only mode
                if (api.dialogApi.confirmDiscard()) {
                    $playlistOnlyMode.proposed = false
                    loadPlaylist() 
                }
            }
        }
    }

    async function _regenPlaylist(playlist: SongItemData) {
        console.log("starting regen...")
        console.time("> (regen) regened this playlist in: ")
        await _generatePlaylists() //regen them
        _editPlaylist(playlist, false) //load the playlist without ticking
        dispatch("regenPlaylist") // make button bar save and discard the playlist
    }

    let genDisabled = false

    const unsub = config.subscribe((val) => { fetchPlaylists(); /*console.log("fetched playlists")*/ })
    onDestroy(unsub)
</script>

<aside>
    <div class="sidebar-buttons">
        <!-- i added an :if block to only render the gen button when it's not generating but it did the generation so fast, it didn't even dissaper, it just stayed there. i will add a success toast rather than block the button later. -->
        <Button 
            variant="outlined" 
            class="mdbutton mdborder fullwidth"
            on:click={_generatePlaylists}>Generate Playlists</Button>
        <Button 
            variant="outlined" 
            class="mdbutton mdborder fullwidth"
            on:click={_deleteGeneratedPlaylists}>Delete generated Playlists</Button>
        <Button 
            variant="outlined" 
            class="mdbutton mdborder fullwidth"
            title={pomExplanation}
            on:click={() => {$playlistOnlyMode.proposed = !$playlistOnlyMode.proposed}}>
            <span class:btn-activef={$playlistOnlyMode.real} class="playlistOnlymodeWrapperSpan">
                <Label>Playlist-only mode</Label>
                <Icon class="material-icons icon-135 mdicontext">help_outline</Icon>
            </span>
        </Button>
    </div>
    <TextDivider content="Your Playlists: "/>

    <div class="sidebar-playlists">
        {#each sidebarPlaylists as ply}
            <SongItem data={ply} noFly={true}>
                {#if ply.comPlaylist } 
                    <SongItemButton icon="autorenew" desc="{regenExplanation}" on:click={() => _regenPlaylist(ply)}/> 
                {/if}
                <SongItemButton icon="drive_file_rename_outline" desc="Edit Playlist" on:click={() => _editPlaylist(ply)}/>
            </SongItem>
        {/each}
    </div>
    
</aside>    

<style>
    /* your styles go here */
    aside {
        background: var(--bg-secondary);
        grid-area: Sidebar;
        padding: /*var(--standard-padding)*/0.8rem;

        display: grid;
        grid-template-columns: 100%;
        grid-template-rows: min-content min-content 1fr;
        grid-gap: 0.3rem;
    }
    .sidebar-buttons {
        display: grid;
        gap: 0.5rem;
        margin-bottom: 0.2rem;
    }
    .sidebar-playlists {
        max-height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
    }
</style>