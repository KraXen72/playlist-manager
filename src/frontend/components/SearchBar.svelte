<script lang="ts">
  import Textfield from "@smui/textfield";
  // import Icon from '@smui/textfield/icon';
  // import CircularProgress from '@smui/circular-progress';
  import Button, { Label, Group } from "@smui/button";
  import LinearProgress from '@smui/linear-progress';

  import { onDestroy, onMount } from "svelte";

  import playlistPic from "$assets/playlist.png";
  import generated from "$assets/generated.png"

  export let completeFrom = <SongItem[]>[];
  export let disabled = false

  export let searchMode = {
    special: false,
    artist: false
  }//special, artist

  //@ts-ignore
  import Autocomplete from "@trevoreyre/autocomplete-js";
  let autocomp_bind: any
  let inpVal = ""
  const bull = `&nbsp;&#8226;&nbsp;`;
  let cacheTagsProgress = 0

  // @ts-ignore
  import { getExtOrFn, autocompleteDestroy, precisionRound } from '$rblib/esm/lib';
  import { detailsData, currPlaylist, tagDB, config, extraDetailsData, playlistOnlyMode } from '$common/stores';

  let options = {
    search: (input: string) => {
      if (input.trim().length < 1) { return [] }

      let res = completeFrom;
      
      //filter out songs already in currPlaylist
      res = res.filter(item => { 
        let inPlaylist = $currPlaylist.some(song => song.fullpath === item.fullpath)
        return !inPlaylist
      })

      if ($playlistOnlyMode.real && searchMode.artist) { searchMode.artist = false }

      //find matches for artist mode vs normal mode
      if (!searchMode.artist) { //normal
        res = res.filter(song => song.filename.toLowerCase().includes(input.toLowerCase()));
      } else if (searchMode.artist) { //artist
        res = res.filter(song => song.type !== "playlist")
          .filter(song => $tagDB[song.filename].artist.toLowerCase().includes((input.toLowerCase())))
      }
      
      //special mode
      if (searchMode.special) {
        const regex = new RegExp(`[^\\x00-\\x7F]`, "gi");
        res = res.filter((song) => song.filename.match(regex));
      } 

      if ($playlistOnlyMode.real) {
        res = res.filter(song => song.type === "playlist")
      } else {
        //sort the results so playlists are on top
        res = res.sort((a, b) => {
          //only add playlists on top if they start with the query
          const lowInput = input.toLowerCase()
          if ((a.type === "playlist" && b.type === "song") && a.prettyName?.toLowerCase().startsWith(lowInput)) {
            return -1;
          } else if ((a.type === "song" && b.type === "playlist") && b.prettyName?.toLowerCase().startsWith(lowInput)) {
            return 1;
          } else {
            return 0;
          }
        });
      }
      if (searchMode.special || searchMode.artist || $playlistOnlyMode.real) {
        return res
      } else {
        return res.slice(0, 10)
      }
    },
    onUpdate: async (results: [], selectedIndex: number) => {
      let selsong: SongItemPlus = results[selectedIndex]
      let filename = selsong?.filename ?? "nothing_selected"

      //let tag = $tagDB[selsong.prettyName]
      if (filename !== 'nothing_selected') {
        if (selsong.type === "song") {
          let tag = $tagDB[filename]
          $detailsData = {
            coversrc: tag.cover,
            title: tag?.title ?? "Unknown Title",
            artist: tag?.artist ?? "Unknown artist",
            album: tag?.album ?? "Unknown Album",
          }
        } else if (selsong.type === "playlist") {
          let isCom = Object.keys($config.comPlaylists).includes(selsong.fullpath)
          $detailsData = {
            coversrc: isCom ? generated : playlistPic,
            title: selsong.filename,
            artist: `Playlist${bull}${selsong.songs.length} Songs`,
            album: selsong.fullpath,
          }
          $extraDetailsData.forceState = "hide"
          
        }
      }
    },
    onSubmit: (result: SongItem) => {
      //console.log(result)
      if (typeof result !== "undefined") {
        $currPlaylist = [...$currPlaylist, result]
        inpVal = ''
      } else {
        console.error("No results for given query")
      }
    },
    autoSelect: true,
    getResultValue: (result: SongItem) => {
      if (result.type === "song") {
        return result.prettyName || getExtOrFn(result.filename).fn
      } else if (result.type === "playlist") {
        let res = result.prettyName || getExtOrFn(result.filename).fn
        return `${res} (Playlist)`
      }
    }
  };
  onMount(() => {
    //console.log("binding autocomplete")
    autocomp_bind = new Autocomplete("#autocomplete", options);
  })
  onDestroy(() => {
    //console.log("destroying autocomplete")
    autocompleteDestroy(autocomp_bind)
  })

  let txtProps = {
    label: "Start typing a name of a song or playlist...",
    value: "",
    variant: "outlined",
    input$class: "autocomplete-input",
    helperLine$class: "fullwidth", 
    class: 'fullwidth'
  }
  const inpTitle = "Please wait, getting tags for songs..."

  window.addEventListener("message", (event) => {
      // event.source === window means the message is coming from the preload
      // script, as opposed to from an <iframe> or other source.
      if (event.source === window) {
          const value = event.data?.purpose 
          switch (value) {
              //all of these are skipped because they are going to be handled elsewhere
              case "cacheTagsProgress":
                  cacheTagsProgress = event.data.value
                  break;
              default:
                  console.log("from preload:", event.data);
                  break;
          }
      }
  });
</script>

<div class="comp" class:notready={disabled}>
  <div id="autocomplete" class="autocomplete fullwidth">
    <Textfield {...txtProps} bind:value={inpVal}/> 
    <ul class="autocomplete-result-list" />
  </div>
  <Group variant="outlined">
    <Button 
      variant="outlined" title="find songs with hard to type titles"
      class="smui-icon-btn {searchMode.special ? "btn-activef" : ""}" 
      on:click={() => searchMode.special = !searchMode.special}>
        <Label class="material-icons">emoji_symbols</Label>
    </Button>
    <Button 
      variant="outlined" title="search by artist"
      disabled = {$playlistOnlyMode.real ? true : null}
      class="smui-icon-btn 
        {searchMode.artist && !$playlistOnlyMode.real ? "btn-activef" : ""}
        {$playlistOnlyMode.real ? "btn-force-default opacity50" : ""}"
      on:click={() => searchMode.artist = !searchMode.artist}>
        <Label class="material-icons">person_search</Label>
    </Button>
  </Group>
</div>

{#if disabled}
  <div class="comp blocker">
      <div class="progress-text">
        Fetching metadata for songs...
      </div>
      <div class="progress-bar">
        <LinearProgress progress={precisionRound(cacheTagsProgress/100, 2)} /> {cacheTagsProgress}%
      </div>
  </div>
{/if}

<style>
  div.comp {
    grid-area: SearchBar;
    display: flex;
    align-items: center;
    column-gap: var(--col-gap);

    padding: var(--standard-padding);
    background: var(--bg-secondary);
  }
  .comp.blocker {
    flex-direction: column;
  }

  .comp .progress-text, .comp .progress-bar {
    width: 100%;
  }
  .comp .progress-bar {
    display: flex;
    align-items: center;
    column-gap: 1rem;
  }

  .notready {
   display:none !important;
  }

  /*.progHolder {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }*/
</style>
