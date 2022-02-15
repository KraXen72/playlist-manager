<script lang="ts">
    import SongItem from './SongItem.svelte';
    import placeholder from "$assets/placeholder.png";
    import playlistSrc from "$assets/playlist.png";
    import generated from "$assets/generated.png"
    import { currPlaylist, tagDB, config, playlistOnlyMode } from '$common/stores'
    import { onDestroy } from 'svelte';

    const bull = `&nbsp;&#8226;&nbsp;`;
    const api = window.api

    const buttons: SongItemButton[] = [
        {
            icon: "more_vert",
            desc: "More options",
            fn: "moremenu"
        },
        {
            icon: "close",
            desc: "Remove song from playlist",
            fn: "remove"
        }
    ]

    function getSongItemDataFromTag(data: Tag, sItemData: SongItemPlus) {
        if (sItemData.type === "song") {
            return <SongItemData>{
                coversrc: data.cover,
                title: data.title,
                artist: data.artist,
                album: data.album,
                filename: sItemData.filename,
                allSongsIndex: sItemData.index,
                type: "song",
                bold: false,
                nocover: false
            }
        } else if (sItemData.type === "playlist") {
            const isCom = Object.keys($config.comPlaylists).includes(sItemData.fullpath)
            return <SongItemData>{
                coversrc: isCom ? generated : playlistSrc,
                title: sItemData.filename,
                artist: `Playlist • ${sItemData.songs.length} Songs`,
                album: sItemData.fullpath,
                filename: sItemData.filename,
                allSongsIndex: sItemData.index,
                type: "playlist",
                bold: false,
                nocover: false
            }
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
</script>

<div id="playlist-bar-wrapper">
    <div id="playlist-scroll-wrap">
      <div id="playlist-bar">
        {#each $currPlaylist as i, index}
            <SongItem data={getSongItemDataFromTag($tagDB[i.filename], i)} {buttons}/>
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