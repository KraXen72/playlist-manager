<script lang="ts">
  import Textfield from "@smui/textfield";
  import Button, { Label, Group } from "@smui/button";
  import { onMount } from "svelte";

  // @ts-ignore
  import Autocomplete from "@trevoreyre/autocomplete-js";
  export let completeFrom = <SongItem[]>[];
  
  import { getExtOrFn } from '$rblib/esm/lib'

  const api = window.api

  let options = {
    search: (input: string) => {
      if (input.trim().length < 1) { return [] }
      let res = completeFrom;

      res = res.filter((song) => {
        //find matches
        return song.filename.toLowerCase().includes(input.toLowerCase()); //fuck regex we doin includes
      });

      // res = res.filter((song) => {
      //   //filter out things already in playlist to avoid duplicates
      //   for (let i = 0; i < currPlaylist.length; i++) {
      //     if (song.filename == currPlaylist[i].filename) {
      //       return false;
      //     }
      //   }
      //   return true;
      // });

      // if (specialMode == true) {
      //   res = res.filter((song) => {
      //     const regex = new RegExp(`[^\\x00-\\x7F]`, "gi");
      //     return song.filename.match(regex);
      //   });
      // }
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

      //if specialmode or playlist only mode then return full results, otherwise first 10
      // return specialMode == true ||
      //   autocompArr == "playlists" ||
      //   artistMode == true
      //   ? res
      //   : res.slice(0, 10);
      return res.slice(0, 10)
    }/*,
    onUpdate: (results, selectedIndex) => {
      if (selectedIndex > -1) {
        updatePreview(results[selectedIndex], false);
      } //update the song preview
    }*/,
    onSubmit: (result: any) => {
      //final pick
      //autocompleteSubmit(result, true);
      console.log(result)
    },
    autoSelect: true,
    getResultValue: (result: SongItem) => {
      let final = getExtOrFn(result.filename).fn;//result.filename//

      return `<span index="${result.index}">${final}${/*
        result.type == "playlist" && autocompArr == "both" ? ` (Playlist)` : ""
      */""}</span>`;
    }
  };
  onMount(() => {
    new Autocomplete("#autocomplete", options);
  })
  
</script>

<div class="comp">
  <div id="autocomplete" class="autocomplete fullwidth">
    <Textfield
      label="Start typing a name of a song or playlist..."
      value=""
      variant="outlined"
      class="fullwidth"
      input$class="autocomplete-input"
      helperLine$class="fullwidth"
    />
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
</style>
