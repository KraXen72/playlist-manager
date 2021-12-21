<script lang="ts">
    import { onMount } from 'svelte';
    import placeholder from "../assets/placeholder.png";
    //import { Icon } from '@smui/button';
    import IconButton, { Icon } from '@smui/icon-button';

    import { currPlaylist } from '../common/stores';

    const bull = `&nbsp;&#8226;&nbsp;`;

    export let data: SongItemData = {
        coverid: "",
        coversrc: "",
        title: "Unknown Title",
        artist: "Unknown Artist",
        album: "Unknown Album",
        filename: "unknownpath",
        allSongsIndex: -1,
        bold: false,
        nocover: false,
        type: "song", //song or playlis
    }
    export let buttons = <SongItemButton[]>[]

    let coverelem: HTMLImageElement;
    //data.coversrc = ""

    onMount(() => {
        coverelem.onerror = () => {
            coverelem.src = placeholder
        }
    })

    function _removeSong(index: number) {
        $currPlaylist = $currPlaylist.filter(song => song.index !== index)
    }
    
    function handleButtonClick(action: string, data: SongItemData) {
        switch (action) {
            //TODO implement regen, edit, moremenu
            case 'remove':
                _removeSong(data.allSongsIndex)
                break;
            case 'moremenu':
                
                break;
            default:
                console.error(`unknown button click action '${action}'`)
                break;
        }
    } 
</script>

<div class="songitem" class:nocover={data.nocover}>
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder"></div>
        <img class="songitem-cover cover-{data.coverid}" draggable="false" loading="lazy" src="{data.coversrc}" bind:this={coverelem} alt="cover"/>
    </div>
    <div class="songitem-title" title="{data.title}">
        <span class:bold={data.bold}>{data.title}</span>
    </div>
    <div class="songitem-aa">
        <span class="songitem-artist" title="{data.artist}">{data.artist}</span>
        {@html bull}
        <span class="songitem-album" title="{data.album}">{data.album}</span>
    </div>
    <div class="songitem-filename" hidden>{data.filename}</div>
    <div class="songitem-button-wrap">
        
        {#each buttons as btn, i}
        <button class="songitem-button noselect" on:click={() => handleButtonClick(btn.fn, data)} title={btn.desc}>
            <Icon class="material-icons" touch>{btn.icon}</Icon>
        </button>
        <!-- <IconButton size="button" class="songitem-button noselect" on:click={() => handleButtonClick(btn.fn, data)} title={btn.desc}>
            <Icon class="material-icons">
              {btn.icon}
            </Icon>
        </IconButton> -->
        {/each}
    </div>
</div>

<style>
    .songitem {
        height: min-content;
        padding: 0.2rem 0rem 0.25rem 0rem;
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