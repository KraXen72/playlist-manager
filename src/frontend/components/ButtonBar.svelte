<script lang="ts">
    import Button, {Label, Group} from '@smui/button';
    import IconButton from '@smui/icon-button';
    import { allSongs, config, currPlaylist, maindir } from '$common/stores';

    const api = window.api

    function pick() {
        let temp = api.dialogApi.pickFolder("Pick the main music folder") ?? [$config.maindir]
        $config.maindir = temp[0]
        api.saveConfig("./config.json", $config, false)
    }

    function _savePlaylist() {
        api.currentPlaylist.save($currPlaylist, $allSongs, $maindir)
    }
</script>

<div id="button-bar">
    <Group variant="outlined">
        <Button 
            variant="outlined" 
            class="smui-icon-btn"
            on:click={_savePlaylist}>
            <Label class="material-icons">save</Label>
        </Button>
        <Button variant="outlined" class="smui-icon-btn">
            <Label class="material-icons">close</Label>
        </Button>
    </Group>
    <span class="button-separator">&nbsp;|&nbsp;</span>
    <span class="folder-select">
        <Button variant="outlined" class="mdborder mdbutton" on:click={pick}>Select</Button>
        <Label>
            {$config.maindir || "No folder selected"}
        </Label>
    </span>
    <span class="squishy">
        <IconButton class="material-icons">settings</IconButton>
    </span>
</div>

<style>
    #button-bar {
        grid-area: ButtonBar;
        background: var(--bg-secondary);
        border-top-left-radius: 1rem;
        padding: 0.6rem 0.3rem 0.5rem 0.6rem;
        display: flex;
        align-items: center;
        height: min-content !important;
    }
    .button-separator {
        height: 100%;
    }
    .folder-select {
        flex-grow: 1;
        display: flex;
        align-items: center;
        column-gap: 0.3rem
    }
    .squishy {
        max-height: 36px;
        display: flex;
        align-items: center;
    }
</style>