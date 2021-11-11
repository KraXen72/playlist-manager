<script lang="ts">
    import Button, {Label, Group} from '@smui/button';
    import IconButton from '@smui/icon-button'
</script>

<!-- <div id="button-bar">
    <button class="matter-button-outlined mdiconbutton" id="save" title="save playlist"><i class="material-icons-round md-save"></i></button>
    <button class="matter-button-outlined mdiconbutton ml" id="cancel" title="discard playlist"><i class="material-icons-round md-close"></i></button>
    <span class="ml mr">|</span>
    <span id="select-folder">
      <button class="matter-button-outlined" id="folder-open" title="Select directory with all your music">Select</button>
      <span id="selected-folder">D:\music</span>
    </span>
    <span class="material-icons-round md-settings" id="settings" title="settings"></span>
</div> -->

<div id="button-bar">
    <Group variant="outlined">
        <Button variant="outlined" class="smui-icon-btn">
            <Label class="material-icons">save</Label>
        </Button>
        <Button variant="outlined" class="smui-icon-btn">
            <Label class="material-icons">close</Label>
        </Button>
    </Group>
    <span class="button-separator">&nbsp;|&nbsp;</span>
    <span class="folder-select">
        <Button variant="outlined" class="mdborder mdbutton">Select</Button>
        <Label>
            D:\music
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