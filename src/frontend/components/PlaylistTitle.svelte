<script lang="ts">
    import { playlistName } from "$common/stores";

    let playlistNameDisplay = ''
    let backupPlaylistName = ''

    $: playlistNameDisplay = $playlistName === '' ? 'Untitled Playlist': $playlistName
    
    let mode = 'display'

    import Textfield from '@smui/textfield';
    import Button, {Label, Group} from '@smui/button';

    function updateName() {
        mode = 'display'
    }
    function cancel() {
        mode = 'display'
        $playlistName = backupPlaylistName
    }
    function editmode() {
        mode = "edit"
        backupPlaylistName = $playlistName
    }
    function _checkEnter(event: any) {
        if (event.keyCode == 13) {
            updateName()
        }
    }

</script>

<div>
    {#if mode === 'display'}
        <h4>{playlistNameDisplay}</h4>
        <Button variant="outlined" class="smui-icon-btn" on:click={editmode}><Label class='material-icons'>edit</Label></Button>
    {:else if mode === 'edit'}
    <!-- use={[(node) => node.focus()]} -->
        <Textfield input$id = "test-id" bind:value={$playlistName} input$autofocus label="Playlist name" class="fullwidth" on:keypress={(event) =>{_checkEnter(event)}}></Textfield>
        <Group variant="outlined">
            <Button variant="outlined" class="smui-icon-btn" on:click={updateName}><Label class='material-icons'>done</Label></Button>
            <Button variant="outlined" class="smui-icon-btn" on:click={cancel}><Label class='material-icons'>close</Label></Button>
        </Group>
    {/if}
</div>

<style>
    div {
        display: flex;
        
        align-items: center;
        column-gap: var(--col-gap);
        grid-area: PlaylistTitle;

        padding: var(--standard-padding);

        background: var(--bg-secondary);
    }

    h4 {
        flex-grow: 1;
        text-align: center;
    }
</style>