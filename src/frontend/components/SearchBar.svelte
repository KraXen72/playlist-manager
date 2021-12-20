<script lang="ts">
  import Textfield from "@smui/textfield";
  import Icon from '@smui/textfield/icon';
  import CircularProgress from '@smui/circular-progress';
  import Button, { Label, Group } from "@smui/button";
  import { onDestroy, onMount } from "svelte";

  export let completeFrom = <SongItem[]>[];
  export let disabled = false

  let searchMode = 'normal' //special, artist

  import Autocomplete from "@trevoreyre/autocomplete-js";
  let autocomp_bind

  // @ts-ignore
  import { getExtOrFn, autocompleteDestroy } from '$rblib/esm/lib';
  import { detailsData, currPlaylist, tagDB } from '../common/stores';

  let inpVal = ""
  let options = {
    search: (input: string) => {
      if (input.trim().length < 1) { return [] }

      let res = completeFrom;

      //filter out songs already in currPlaylist
      res = res.filter(item => { 
        let inPlaylist = $currPlaylist.some(song => song.fullpath === item.fullpath)
        return !inPlaylist
      })

      //find matches for artist mode vs normal mode
      if (searchMode === 'normal') {
        res = res.filter(song => song.filename.toLowerCase().includes(input.toLowerCase()));
      } else if (searchMode === 'artist') {
        res = res.filter(song => $tagDB[song.filename].artist.toLowerCase().includes((input.toLowerCase())))
      }
      
      //special mode
      if (searchMode === 'special') {
        const regex = new RegExp(`[^\\x00-\\x7F]`, "gi");
        res = res.filter((song) => song.filename.match(regex));
      } 

      if (searchMode === 'normal') {
        return res.slice(0, 10)
      } else if (searchMode === 'special' || searchMode === 'artist') {
        return res
      }

      //sort the results so playlists are on top
      // res.sort((a, b) => {
      //   if (a.type == "playlist" && b.type == "song") {
      //     return -1;
      //   } else if (a.type == "song" && b.type == "playlist") {
      //     return 1;
      //   } else {
      //     return 0;
      //   }
      // });
    },
    onUpdate: async (results: [], selectedIndex: number) => {
      let selsong: SongItem = results[selectedIndex]
      let filename = selsong?.filename ?? "nothing_selected"
      console.log(filename)

      //let tag = $tagDB[selsong.prettyName]
      if (filename !== 'nothing_selected') {
        //@ts-ignore
        let tag = $tagDB[filename]

        $detailsData = {
          coversrc: tag.cover,
          title: tag?.title ?? "Unknown Title",
          album: tag?.album ?? "Unknown Album",
          artist: tag?.artist ?? "Unknown artist",
        }
      }
    },
    onSubmit: (result: SongItem) => {
      //console.log(result)
      $currPlaylist = [...$currPlaylist, result]
      inpVal = ''
    },
    autoSelect: true,
    getResultValue: (result: SongItem) => {
      return result.prettyName || getExtOrFn(result.filename).fn
      /*return `<span index="${result.index}">${final}${
        result.type == "playlist" && autocompArr == "both" ? ` (Playlist)` : ""
      ""}</span>`;*/
    }/*,
    getResultValue: (result: SongItem) => {
      return getExtOrFn(result.filename).fn;
    }*/
  };
  onMount(() => {
    //console.log("binding autocomplete")
    autocomp_bind = new Autocomplete("#autocomplete", options);
  })
  onDestroy(() => {
    //console.log("destroying autocomplete")
    autocompleteDestroy(autocomp_bind)
  })

  const txtProps = {
    label: "Start typing a name of a song or playlist...",
    value: "",
    variant: "outlined",
    input$class: "autocomplete-input",
    helperLine$class: "fullwidth", 
    class: 'fullwidth'
  }
  const inpTitle = "Please wait, getting tags for songs..."
</script>

<div class="comp" class:notready={disabled} title={disabled ? inpTitle : null}>
  <div id="autocomplete" class="autocomplete fullwidth">
    <Textfield {...txtProps} bind:value={inpVal}/> 
    <ul class="autocomplete-result-list" />
  </div>
  <Group variant="outlined">
    <Button variant="outlined" class="smui-icon-btn"
      ><Label class="material-icons">emoji_symbols</Label></Button
    >
    <Button variant="outlined" class="smui-icon-btn"
      ><Label class="material-icons">person_search</Label></Button
    >
  </Group>
</div>

<style>
  div.comp {
    grid-area: SearchBar;
    display: flex;
    align-items: center;
    column-gap: var(--col-gap);

    padding: var(--standard-padding);
    background: var(--bg-secondary);
  }

  .notready {
    /* pointer-events: none !important;
    filter: grayscale();
    cursor: not-allowed !important; */
  }

  /*.progHolder {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }*/
</style>
