<script lang="ts">
    // component for both songs and playlist in a list

    import { onMount, tick } from 'svelte';
    import { fly } from 'svelte/transition';

    import { currPlaylist, allSongsAndPlaylists, maindir, changesSaved } from '$common/stores';

    import placeholder from "$assets/placeholder.png";

    const bull = `&nbsp;&#8226;&nbsp;`;
    const api = window.api

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
        type: "song", //song or playlist
        comPlaylist: false
    }
    //export let buttons = <SongItemButton[]>[]
    export let noFly = false

    let coverelem: HTMLImageElement;
    //data.coversrc = ""

    onMount(() => { coverelem.onerror = () => { try { coverelem.src = placeholder } catch (e) {} } })

    function _editPlaylist(index: number) {
        const ASData = $allSongsAndPlaylists[index] as PlaylistSongItem
        console.log(ASData, "isCom:", data.comPlaylist)

        async function loadPlaylist() {
            if (!data.comPlaylist) {
                const songsInPlaylist: SongItem[] = []

                for (let i = 0; i < ASData.songs.length; i++) {
                    const song = ASData.songs[i];
                    
                    const fullpath = [ $maindir, ...song.split("/") ].join(api.slash)
                    const songObj = $allSongsAndPlaylists.find(item => item.fullpath === fullpath) ?? "notfound"

                    if (songObj !== "notfound") songsInPlaylist.push(songObj)
                }
                    
                //$currPlaylist = songsInPlaylist
                $currPlaylist  = []
                await tick();
                $currPlaylist = songsInPlaylist

                $changesSaved = true
                //console.log("loaded", songsInPlaylist)
            } else {
                console.log("loading complaylists not implemented yet")
            }
        }

        if ($changesSaved) {
            loadPlaylist()
        } else {
            if (api.dialogApi.confirmDiscard()) loadPlaylist()
        }
    }
</script>
<div 
    class="songitem" 
    class:nocover={data.nocover} 
    on:contextmenu
    in:fly|local={{delay: noFly ? 0 : 80, duration: noFly ? 0 : 380, y:noFly ? 0 :5}}>
    <div class="songitem-cover-wrap">
        <div class="songitem-cover-placeholder"></div>
        <img class="songitem-cover cover-{data.coverid}" draggable="false" loading="lazy" src="{data.coversrc}" bind:this={coverelem} alt="cover"/>
    </div>
    <div class="songitem-title" title="{data.title}">
        <span class:bold={data.bold}>{data.title}</span>
    </div>
    <div class="songitem-aa">
        <span class="songitem-artist" title="{data.artist}">{@html data.artist}</span>
        {@html bull}
        <span class="songitem-album" title="{data.album}">{data.album}</span>
    </div>
    <div class="songitem-filename" hidden>{data.filename}</div>
    <div class="songitem-button-wrap">
        <!-- this slot is for the buttons, expects to have SongItemButton components -->
        <slot></slot>
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
    .songitem:hover .hidden {
        display: flex !important;
    }

    .songitem-button-wrap {
        grid-area: button;
        width: 100%;
        height: 100%;

        display: flex;
        justify-content: flex-end;
        align-items: center;
    }
    /* button styles are in separate component */

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