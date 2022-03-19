<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
    import TextDivider from './TextDivider.svelte';
    import SongItem from './SongItem.svelte';

    import { config, maindir, allPlaylists, playlistOnlyMode } from '$common/stores'
    import { onDestroy, onMount } from 'svelte'
    import { getExtOrFn } from '$rblib/esm/lib';

    const api = window.api

    let sidebarPlaylists: any[] = []
    let buttons: SongItemButton[] = [
        {
            icon: "autorenew",
            desc: "re-make / update: generate this playlist again if you added new songs or removed some",
            fn: "regen"
        },
        {
            icon: "drive_file_rename_outline",
            desc: "Edit Playlist",
            fn: "edit"
        }

    ]
    const blacklist = ["#midis", "archive","on-hold",".stfolder","#deezloader downloads"]
    const pomExplanation = "playlist-only mode: make a combined playlist out of more playlists that later can be easily refreshed/regenerated"

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
        api.saveConfig("./config.json", $config, false)
    }

    export function fetchPlaylists() {
        validateComPlaylists()
        sidebarPlaylists = api.walker.editablePlaylists($maindir).map((key: string)  => {
            let fullpath = `${$maindir}${api.slash}${key}`
            let isCom = Object.keys($config.comPlaylists).includes(fullpath)
            let ASData = _matchPlaylistFromFullpath(fullpath)

            const parts = key.split(api.slash)
            const item: SongItemData = {
                title: getExtOrFn(parts[parts.length - 1]).fn,
                artist: `${typeof ASData?.songs.length !== "undefined" ? ASData?.songs.length :"--"} Songs`,
                filename: key,
                album: key,
                bold: true,
                nocover: true //TODO nice playlist covers like in oto music
            }
            if (isCom) {
                return {item, buttons}
            } else {
                return {item,  buttons: [buttons[1]]}
            }
        })
    }

    const unsub = config.subscribe((val) => {
        fetchPlaylists()
        console.log("fetched playlists")
    })

    function _generatePlaylists() {
        if (!genDisabled) {
            genDisabled = true
            api.gen($maindir, blacklist, $config).then(() => {
                genDisabled = false
            })
        } else {
            console.error("already generating, don't spam")
        }
    }

    let genDisabled = false
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
            <SongItem data={ply.item} buttons={ply.buttons} noFly={true}/>
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