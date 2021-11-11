<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'
</script>

<style>
    /* your styles go here */
    aside {
        background: var(--bg-secondary);
        grid-area: Sidebar;
        padding: var(--standard-padding);
    }
    .sidebar-buttons {
        display: grid;
        gap: 0.5rem;
    }
</style>

<aside>
    <div class="sidebar-buttons">
        <Button variant="outlined" class="mdbutton mdborder fullwidth ">Generate Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">Delete generated Playlists</Button>
        <Button variant="outlined" class="mdbutton mdborder fullwidth">
            <Label>Playlist-only mode</Label>
            <Icon class="material-icons">help_outline</Icon>
        </Button>
    </div>
</aside>