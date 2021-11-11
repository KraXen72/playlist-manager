<div>
    <Textfield label="Start typing a name of a song or playlist..." value='' variant="outlined" class="fullwidth"
    helperLine$class="fullwidth"></Textfield>
    <Group variant="outlined">
        <Button variant="outlined" class="smui-icon-btn"><Label class='material-icons'>emoji_symbols</Label></Button>
        <Button variant="outlined" class="smui-icon-btn"><Label class='material-icons'>person_search</Label></Button>
    </Group>
</div>

<style>
    div {
        grid-area: SearchBar;
        display: flex;
        align-items: center;
        column-gap: var(--col-gap);

        padding: var(--standard-padding);
        background: var(--bg-secondary);
    }

</style>

<script lang="ts">
    import Textfield from '@smui/textfield';
    import Button, { Label, Group } from '@smui/button';
</script>