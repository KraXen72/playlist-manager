<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
    import TextDivider from './TextDivider.svelte';
    import SongItem from './SongItem.svelte';

    import { config, maindir, allPlaylists } from '$common/stores'
    import { onDestroy } from 'svelte'
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

    function _matchPlaylistFromFullpath(fullpath: string) {
        return $allPlaylists.find(playlist => playlist.fullpath === fullpath)
    }

    const unsub = config.subscribe((val) => {
        sidebarPlaylists = api.walker.editablePlaylists($maindir).map((key: string)  => {
            let fullpath = `${$maindir}${api.slash}${key}`
            let isCom = Object.keys($config.comPlaylists).includes(fullpath)
            let ASData = _matchPlaylistFromFullpath(fullpath)

            const parts = key.split(api.slash)
            const item: SongItemData = {
                title: getExtOrFn(parts[parts.length - 1]).fn,
                artist: `${typeof ASData?.songs.length !== "undefined" ? ASData?.songs.length / 2 :"--"} Songs`,
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
        console.log("fetched playlists")
    })

    onDestroy(unsub)

    function generatePlaylists() {
        if (!genDisabled) {
            genDisabled = true
            api.gen($maindir, blacklist, $config).then(() => {
                genDisabled = false
            })
        } else {
            console.warn("already generating, don't spam")
        }
    }

    let genDisabled = false
    
</script>

<aside>
    <div class="sidebar-buttons">
        <Button 
            variant="outlined" 
            class="mdbutton mdborder fullwidth"
            on:click={generatePlaylists}>Generate Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">Delete generated Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">
            <Label>Playlist-only mode</Label>
            <Icon class="material-icons icon-135 mdicontext">help_outline</Icon>
        </Button>
    </div>
    <TextDivider content="Your Playlists: "/>

    <div class="sidebar-playlists">
        {#each sidebarPlaylists as ply}
            <SongItem data={ply.item} buttons={ply.buttons}/>
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