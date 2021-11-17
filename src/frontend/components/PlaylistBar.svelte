<script lang="ts">
    import SongItem from './SongItem.svelte'
    import placeholder from "../assets/placeholder.png";

    let opts = {
        coversrc: placeholder,
        title: "Sarcoma",
        artist: "Killstation",
        album: 'The two of us are dying', 
        bold: false,
        nocover: false
    }
    const buttons: SongItemButton[] = [
        {
            icon: "more_vert",
            desc: "More options",
            fn: (props: object) => {
                console.log("more")
                console.log(props)
            }
        },
        {
            icon: "close",
            desc: "Remove song from playlist",
            fn: () => {
                console.log("remove")
            }
        }
    ]


</script>


<div id="playlist-bar-wrapper">
    <div id="playlist-scroll-wrap">
      <div id="playlist-bar">
        {#each Array(2) as i}
            <SongItem data={opts} {buttons}/>
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