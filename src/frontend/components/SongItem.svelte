<script lang="ts">
    import { onMount } from 'svelte';
    import placeholder from "../assets/placeholder.png";
    import IconButton from '@smui/icon-button';
    import Wrapper from '@smui/touch-target';

    //@ts-ignore
    const api = globalThis.api
    const bull = `&nbsp;&#8226;&nbsp;`;

    export let coverid = "";
    export let coversrc = "";
    export let title = "Unknown Title";
    export let artist = "Unknown Artist";
    export let album = "Unknown Album";
    export let filename = "unknownpath";
    export let bold = false;
    export let nocover = false;
    export let type = "song"; //song or playlist
    export let buttons = <SongItemButton[]>[];

    let coverelem: HTMLImageElement;

    onMount(() => {
        coverelem.onerror = () => {
            coverelem.src = placeholder
        }
    })

</script>

<div class="songitem" class:nocover>
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder"></div>
        <img class="songitem-cover cover-{coverid}" draggable="false" loading="lazy" src="{coversrc}" bind:this={coverelem} alt="cover"/>
    </div>
    <div class="songitem-title" title="{title}">
        <span class:bold>{title}</span>
    </div>
    <div class="songitem-aa">
        <span class="songitem-artist" title="{artist}">{artist}</span>
        {@html bull}
        <span class="songitem-album" title="{album}">{album}</span>
    </div>
    <div class="songitem-filename" hidden>{filename}</div>
    <div class="songitem-button-wrap">
        <Wrapper>
        {#each buttons as btn, i}
            <div class="songitem-button">
                <IconButton class="material-icons">{btn.icon}</IconButton>
            </div>
        {/each}
        </Wrapper>
    </div>
</div>

<style>
    .songitem {
        height: min-content;
        padding: 0.2rem 0.2rem 0.25rem 0rem;
        display: grid;
        grid-template: 1.5rem 1.5rem / 3rem minmax(0%, 100%) min-content;
        grid-template-areas:
        "cover title button"
        "cover albArt button";
        width: 100%;
    }
    .nocover {
        grid-template-columns: 0rem minmax(0%, 100%) min-content;
    }

    .songitem-cover-wrap {
        height: auto;
        width: auto;
        box-sizing:border-box;
        grid-area: cover;
        margin: 0.2rem;
        border-radius: 0.3rem;
        position: relative;
    }
    .nocover .songitem-cover-wrap {
        display: none;
    }

    .songitem-cover, .songitem-cover-placeholder {
        box-sizing:border-box;
        width: 100%;
        height: 100%;
        border-radius: 0.3rem;
    }
    .songitem-cover {
        position: absolute;
        z-index: 2;
        top: 0;
        object-fit: scale-down;
    }
    .songitem-cover::selection {
        background: transparent;
    }
    .songitem-cover-placeholder {
        /*TODO fix this import using public*/
        background-image: url("img/placeholder.png");
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
    }
    .songitem-button-wrap {
        grid-area: button;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: flex-end;
        align-items: center;
    }
    .songitem:hover .hidden {
        display: flex !important;
    }
    .songitem-button {
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }
    .songitem-title {
        grid-area: title;
        margin-left: 0.2rem;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
    .songitem-aa {
        grid-area: albArt;
        font-size: 0.8rem;
        display: flex;
        max-width: auto;
        align-items: center;
        margin-left: 0.2rem;
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
        /*border-bottom: 1px solid #383838;*/
    }
    .songitem-album {
        text-overflow: ellipsis;
        white-space: nowrap;
        overflow: hidden;
    }
    .songitem-artist {
        width: auto;
        flex: none;
    }
    .songitem-aa, .songitem-album, .songitem-artist, .songitem-title {
        font-stretch: condensed;
    }
</style>