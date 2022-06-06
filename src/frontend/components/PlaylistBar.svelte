<script lang="ts">
    import SongItem from './SongItem.svelte';
    import SongItemButton from './SongItemButton.svelte';
    //import placeholder from "$assets/placeholder.png";
    import playlistSrc from "$assets/playlist.png";
    import generated from "$assets/generated.png"

    import { summonMenu, zeropad } from '$rblib/esm/lib';

    import { currPlaylist, tagDB, config, playlistOnlyMode, detailsData, extraDetailsData, viewCoverPath } from '$common/stores'
    import { onDestroy } from 'svelte';
    
    //const bull = `&nbsp;&#8226;&nbsp;`;
    const api = window.api

    function getSongItemDataFromTag(data: Tag, sItemData: SongItemPlus) {
        //shared between songs and playlists
        const shared = <SongItemData>{
            bold: false,
            nocover: false,
            filename: sItemData.filename,
            allSongsIndex: sItemData.index,
        }

        if (sItemData.type === "song") {
            Object.assign(shared, {
                coversrc: data.cover,
                title: data.title,
                artist: data.artist,
                album: data.album,
                type: "song",
            })
            return shared
        } else if (sItemData.type === "playlist") {
            const isCom = Object.keys($config.comPlaylists).includes(sItemData.fullpath)
            Object.assign(shared, {
                coversrc: isCom ? generated : playlistSrc,
                title: sItemData.filename,
                artist: `Playlist • ${sItemData.songs.length} Songs`,
                album: sItemData.fullpath,
                type: "playlist",
            })
            return shared
        }
    }

    const unsub = playlistOnlyMode.subscribe((val) => {
        if (val.proposed) {
            let mixed = $currPlaylist.some(song => song.type === "song")
            if (!mixed) {
                val.real = val.proposed
            } else {
                const question = "Are you sure you want do discard songs from playlist?"
                const details = "You are about to enter playlist-only mode, but your current playlist also contains songs. Discard songs from current playlist and proceed?"
                let confirmDiscard = api.dialogApi.confirmdialog(question, details)
                if (confirmDiscard) {
                    $currPlaylist = $currPlaylist.filter(song => song.type === "playlist")
                    val.real = val.proposed
                } else {
                    val.proposed = false
                }
            }
        } else {
            val.real = val.proposed
        }
    })
    onDestroy(unsub)

    //SongItemButton functions
    function _removeSong(index: number) { $currPlaylist = $currPlaylist.filter(song => song.index !== index) }

    /** prepare functions for summonMenu given a songItem*/
    function _prepareMenu(event: Event, songItem: SongItemPlus) {
        type MenuItem = { text: string; run: Function; }
        let menuItems: MenuItem[] = [] //any shared stuff

        if (songItem.type !== "song" && songItem.type !== "playlist") {
            console.error("didn't summon menu because songitem is type " + songItem.type)
            return
        }
        
        if (songItem.type === "song") {

            /** show the song details. uses variables passed as parameters to _prepareMenu */
            function _songDetails() {
                api.getEXTINF(songItem.fullpath, songItem.filename, true, true, true).then(extrainfo => {
                    if (typeof extrainfo === "string"){ throw Error('Impossible') } 
                    let prep = {
                        duration: `${
                            Math.floor(Math.floor(Number(extrainfo.duration))/1000 / 60) //min
                        }:${
                            zeropad(Math.floor(Number(extrainfo.duration)/1000) % 60, 2) //sec
                        }`,
                        path: songItem.fullpath,
                        forceState: "show"
                    } as ExtraDetailsData
                    Object.assign(prep, extrainfo.extrainfo)
                    $extraDetailsData = prep
                    $viewCoverPath = false

                    let tag = $tagDB[songItem.filename]
                    $detailsData = {
                        coversrc: tag.cover,
                        title: tag?.title ?? "Unknown Title",
                        album: tag?.album ?? "Unknown Album",
                        artist: tag?.artist ?? "Unknown artist",
                    }
                })
            }

            /** view song cover. uses local variables passed as parameters */
            function _songViewCover() {
                const tag = $tagDB[songItem.filename]

                $viewCoverPath = tag.cover ?? false
                $extraDetailsData.forceState = "hide"
                $detailsData = {
                    coversrc: tag.cover,
                    title: tag?.title ?? "Unknown Title",
                    album: tag?.album ?? "Unknown Album",
                    artist: tag?.artist ?? "Unknown artist",
                }
            }

            menuItems = [
                ...menuItems,
                {
                    text: "Details",
                    run: _songDetails
                },
                {
                    text: "View cover",
                    run: _songViewCover
                } 
            ]
        } else {
            /** show playlist details. uses local variables passed as parameters */
            function _playlistDetails() {
                let isCom = Object.keys($config.comPlaylists).includes(songItem.fullpath)
                let lines = []
                if (isCom) {
                    lines = [
                            "This generated playlist contains: ", "",
                            ...$config.comPlaylists[songItem.fullpath].map(item => item.filename)
                        ]
                } else {
                    let songLines = ( songItem.songs && Array.isArray(songItem.songs) )
                    ? [...songItem.songs.filter((l: string) => !l.includes("#EXTINF:"))] 
                    : ["No songs..."] ;
                    
                    lines = [ "This playlist contains: ", "", ...songLines ]
                }
                api.dialogApi.infodialog(lines.join("\n"))
            }

            menuItems = [
                ...menuItems,
                {
                    text: "Details",
                    run: _playlistDetails
                }
            ]
        }
        //@ts-ignore the type is correct but idk
        summonMenu({ menuItems }, event)
    }

</script>

<div id="playlist-bar-wrapper">
    <div id="playlist-scroll-wrap">
      <div id="playlist-bar">
        {#each $currPlaylist as i, index}
            <SongItem data={getSongItemDataFromTag($tagDB[i.filename], i)} on:contextmenu={e =>_prepareMenu(e,i)}>
                <SongItemButton 
                    icon="more_vert" 
                    desc="More options"
                    on:click={(e) => _prepareMenu(e, i)}
                /> 
                <SongItemButton 
                    icon="close" 
                    desc="Remove song from playlist" 
                    on:click={() => _removeSong(i.index)}
                />
            </SongItem>
        {/each}
      </div>
    </div>
  </div>

<style>
    #playlist-bar-wrapper {
        grid-row: 2 / 4;
        grid-column: 2 / 3;
        background: var(--bg-secondary);
        height: 100%;

        grid-area: PlaylistBar;
    }
    #playlist-scroll-wrap {
        border-top-left-radius: 1rem;
        background: var(--bg-primary);
        width: 100%;
        height: 100%;
        padding: 0.42rem;
        overflow-y: auto;
        overflow-x: hidden;
    }
    #playlist-bar {
        width: 100%;
        height: 100%;
        display: grid;
        grid-template-columns: 100%;
        grid-auto-rows: min-content;
        background: transparent;
    }
</style>