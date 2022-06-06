<script lang="ts">
    import { Icon } from '@smui/icon-button';

    export let icon = "adjust" //placeholder icon
    export let desc = "this is a SongItemButton"
</script>

<button class="songitem-button noselect" on:click title={desc}>
    <Icon class="material-icons" touch>{icon}</Icon>
</button>

<style>
    .songitem-button {
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
        /*width: 24px;*/

        border: none;
        background: transparent;
        color: var(--text);
        transition: opacity 0.1s;
    }
    .songitem-button:focus-visible{
        outline: none !important;
        color: white;
    }
    .songitem-button:focus-visible i {
        box-shadow: 0px 0px 19px 0px rgba(0,0,0,1);  
    }
    .songitem-button:hover {
        opacity: 80%;
    }
    .songitem-button:active {
        opacity: 50%;
    }
</style>