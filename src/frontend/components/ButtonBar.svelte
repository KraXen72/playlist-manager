<script lang="ts">
    import Button, {Label, Group} from '@smui/button';
    import IconButton from '@smui/icon-button';

    import { config, currPlaylist, maindir, playlistName, playlistOnlyMode } from '$common/stores';
    import { createEventDispatcher, onDestroy } from 'svelte';

    import playlistImg from "$assets/playlist.png"
    const dispatch = createEventDispatcher()

    const api = window.api
    let changesSaved = true

    function pick() {
        let temp = api.dialogApi.pickFolder("Pick the main music folder") ?? [$config.maindir]
        $config.maindir = temp[0]
        api.saveConfig("./config.json", $config, false)
    }

    function _savePlaylist() {
        //console.log($playlistOnlyMode.real)
        function _postSave() {
            dispatch("refresh", "sidebar")
            changesSaved = true
        }

        if ($playlistOnlyMode.real) {
            api.currentPlaylist.save($currPlaylist, $maindir, $playlistName, playlistImg)
            $config.comPlaylists[`${$maindir}${api.slash}${$playlistName}.m3u`] = [...$currPlaylist.map(item => {
                return {
                    filename: item.filename,
                    fullpath: item.fullpath,
                    relativepath: item.relativepath
                }
            })]
            api.saveConfig("./config.json", $config, false)
            _postSave()
        } else if ($playlistOnlyMode.real === false && $currPlaylist.every(item => item.type === "playlist")) {
            //propose saving as playlist only.
            const question = "Do you want to save as combined playlist?"
            const details = "Your playlist only contains playlists. Do you want to save it as a combined playlist? Combined playlists can be later regenerated if you add any songs to them."
            let confirmCombined = api.dialogApi.confirmdialog(question, details)
            if (confirmCombined) {
                $playlistOnlyMode.proposed = true
                _savePlaylist()
            } else {
                api.currentPlaylist.save($currPlaylist, $maindir, $playlistName, playlistImg)
                _postSave()
            }
        } else {
            api.currentPlaylist.save($currPlaylist, $maindir, $playlistName, playlistImg)
            _postSave()
        }
    }

    function _discardPlaylist() {
        if (changesSaved) {
            $currPlaylist = []
            $playlistName = ""
        } else {
            const question = "Do you want to discard current playlist?"
            const details = "The current progress/changes will be lost."
            let confirmDiscard = api.dialogApi.confirmdialog(question, details)
            if (confirmDiscard) {
                $currPlaylist = []
                $playlistName = ""
            }
        }   
    }
    
    const unsub = currPlaylist.subscribe((val) => {
        if (val.length === 0) {
            changesSaved = true
        } else {
            changesSaved = false
        }
    })
    onDestroy(unsub)
</script>

<div id="button-bar">
    <Group variant="outlined">
        <Button 
            variant="outlined" 
            class="smui-icon-btn"
            on:click={_savePlaylist}>
            <Label class="material-icons {`${changesSaved === false ? "btn-danger" : ""}`}">save</Label>
        </Button>
        <Button 
            variant="outlined" 
            class="smui-icon-btn"
            on:click={_discardPlaylist}>
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