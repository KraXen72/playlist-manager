<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
    import TextDivider from './TextDivider.svelte';
    import SongItem from './SongItem.svelte';

    import { config } from '../common/stores'
    import { onDestroy } from 'svelte'
    import { getExtOrFn } from '$rblib/esm/lib';

    const api = window.api

    let sidebarPlaylists: SongItemData[] = []

    const unsub = config.subscribe((val) => {
        sidebarPlaylists = Object.keys(val.comPlaylists).map( (key)  => {
            //const playlist = val.comPlaylists[key]

            const parts = key.split(api.slash)
            const item: SongItemData = {
                title: getExtOrFn(parts[parts.length - 1]).fn,
                artist: "-- Songs", //TODO get playlist length
                filename: key,
                album: key,
                bold: true,
                nocover: true
            }
            return item
        })
        console.log("fetched playlists")
    })

    onDestroy(unsub)

    let opts = {
        title: "temp batch 1.m3u",
        artist: "25 Songs",
        album: 'D:\\music\\temp batch 1.m3u', 
        bold: true,
        nocover: true,
        type: "playlist"
    }
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
</script>

<aside>
    <div class="sidebar-buttons">
        <Button variant="outlined" class="mdbutton mdborder fullwidth ">Generate Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">Delete generated Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">
            <Label>Playlist-only mode</Label>
            <Icon class="material-icons icon-135 mdicontext">help_outline</Icon>
        </Button>
    </div>
    <TextDivider content="Your Playlists: "/>

    <div class="sidebar-playlists">
        {#each sidebarPlaylists as opts}
            <SongItem data={opts} {buttons}/>
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