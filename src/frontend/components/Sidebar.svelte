<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
    import TextDivider from './TextDivider.svelte';
    import SongItem from './SongItem.svelte';

    let opts = {
        title: "temp batch 1.m3u",
        artist: "25 Songs",
        album: 'D:\\music\\temp batch 1.m3u', 
        bold: true,
        nocover: true
    }
</script>

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
        {#each Array(3) as i}
            <SongItem {...opts}/>
        {/each}
    </div>
    
</aside>    