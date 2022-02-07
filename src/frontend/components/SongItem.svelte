<script lang="ts">
    import { summonMenu } from '$rblib/esm/lib';
    import { Icon } from '@smui/icon-button';
    import { onMount } from 'svelte';
    import placeholder from "$assets/placeholder.png";
    import { allSongs, currPlaylist, extraDetailsData, detailsData, tagDB, allSongsAndPlaylists, config, viewCoverPath } from '$common/stores';
    import { zeropad } from "$rblib/esm/lib"

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
    
    function _handleButtonClick(action: string, data: SongItemData, event: Event) {
        switch (action) {
            //TODO implement regen, edit, moremenu
            case 'remove':
                _removeSong(data.allSongsIndex)
                break;
            case 'moremenu':
                if (data.type === "song") {
                    //@ts-ignore
                    summonMenu(songMenuOptions, event)
                } else if (data.type === "playlist") {
                    //@ts-ignore
                    summonMenu(playlistMenuOptions, event)
                } else {
                    console.error("this SongItem's type is neither 'song' or 'playlist'")
                }
                break;
            default:
                console.error(`unknown button click action '${action}'`)
                break;
        }
    }

    //you can reference local variables/functions here vv
    // gonna use this for the three dots button action, since each songitem will only have this as the moremenu
    let songMenuOptions = {
        buttons: [
            {
                text: "Details",
                run: () => {
                    let ASData = $allSongs[data.allSongsIndex] // we need this to get fullpath of song
                    api.getEXTINF(ASData.fullpath, data.filename, true, true, true).then(extrainfo => {
                        if (typeof extrainfo === "string"){throw Error('Impossible')} // this apparently eliminates the x is not on type "string" errors
                        let prep: ExtraDetailsData = {
                            duration: `${Math.floor(Math.floor(extrainfo.duration)/1000 / 60)}:${zeropad(Math.floor(extrainfo.duration/1000) % 60, 2)}`,
                            path: ASData.fullpath,
                            forceState: "show"
                        }
                        Object.assign(prep, extrainfo.extrainfo)
                        $extraDetailsData = prep
                        $viewCoverPath = false

                        let tag = $tagDB[data.filename]
                        $detailsData = {
                            coversrc: tag.cover,
                            title: tag?.title ?? "Unknown Title",
                            album: tag?.album ?? "Unknown Album",
                            artist: tag?.artist ?? "Unknown artist",
                        }
                    })
                    
                }
            },
            {
                text: "View cover",
                run: () => {
                    $viewCoverPath = data.coversrc
                    $extraDetailsData.forceState = "hide"

                    let tag = $tagDB[data.filename]
                    $detailsData = {
                        coversrc: tag.cover,
                        title: tag?.title ?? "Unknown Title",
                        album: tag?.album ?? "Unknown Album",
                        artist: tag?.artist ?? "Unknown artist",
                    }
                }
            }
        ]
    }

    let playlistMenuOptions = {
        buttons: [
            {
                text: "Details",
                run: () => {
                    let ASData = $allSongsAndPlaylists[data.allSongsIndex]
                    let isCom = Object.keys($config.comPlaylists).includes(ASData.fullpath)
                    let lines = []
                    if (isCom) {
                        lines = [
                                "This generated playlist contains: ", "",
                                ...$config.comPlaylists[ASData.fullpath].map(item => item.filename)
                            ]
                    } else {
                        lines = [
                                "This playlist contains: ", "",
                                ...ASData.songs.filter((l: string) => !l.includes("#EXTINF:"))
                            ]
                    }
                    api.infodialog(lines.join("\n"))
                }
            },
        ]
    }
</script>

<div 
    class="songitem" 
    class:nocover={data.nocover} 
    on:contextmenu={(event) => _handleButtonClick("moremenu", data, event)}>
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
        {#each buttons as btn, i}
            <button class="songitem-button noselect" on:click={(event) => _handleButtonClick(btn.fn, data, event)} title={btn.desc}>
                <Icon class="material-icons" touch>{btn.icon}</Icon>
            </button>
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