<script lang="ts">
    import Button, { Icon, Label } from '@smui/button'

    export let data = {
        path: 'Unknown Path', //D:\music\main\cozyboy - what did you think i meant when i said i love you.mp3
        genre: 'Unknown Genre', //R&B
        format: 'Unknown Format', //MPEG 1 layer 3
        duration: '0:00', //3:01
        bitrate: 'Unknown bitrate', //320 kb/s
        size: 'Unknown size', //0.00 MB
        samplerate: 'Unknown', //44100 Hz
        year: 'Unknown Year' //2018
    }
    export let hide = false;
    const desc = {
        path: 'Path to song',
        genre: 'Genre: ',
        format: 'Format / Codec: ',
        duration: 'Duration: ',
        bitrate: 'Bitrate: ',
        size: 'Size: ',
        samplerate: 'Sample rate: ',
        year: 'Year: '
    }

    let display = Object.keys(data).map(key => {
        // @ts-ignore
        return { key, val: data[key], desc: desc[key]}
    })

    function hideme() {
        hide = true;
    }
</script>

<article class:hidden-f={hide}>
    {#each display as prop, i}
        <span title={prop.desc} class="key {prop.key}" style="grid-area: k{prop.key};">{prop.desc}</span>
        <span title={prop.val} class="value {prop.key}" style="grid-area: {prop.key};">{prop.val}</span>
    {/each}
    <hr class="spacer">
    <span class="closebtn">
        <Button variant="outlined" class="mdbutton mdborder" on:click={hideme}>
            <Label>Collapse</Label>
            <Icon class="material-icons icon-135 mdicontext">expand_more</Icon>
        </Button>
    </span>
</article>

<style>
    article {
        display: grid;
        grid-template: repeat(3, 1fr) 1rem repeat(2, 1fr) / repeat(5, 1fr);
        grid-template-areas:
        "kpath kpath path path path"
        "kgenre kgenre genre genre closebtn"
        "kformat kformat format format closebtn"
        "spacer spacer spacer spacer spacer"
        "kduration duration ksize size kyear"
        "kbitrate bitrate ksamplerate samplerate year";

        margin: 0.5rem;
        position: relative;
        column-gap: 0.2rem;
    }
    .key {
        font-weight: bold;
    }
    .key, .value {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    /* .key.path { grid-area: kpath; }
    .value.path { grid-area: path; }

    .key.genre { grid-area: kgenre; }
    .value.genre { grid-area: genre; }

    .key.format { grid-area: kformat; }
    .value.format { grid-area: format; }

    .key.duration { grid-area: kduration; }
    .value.duration { grid-area: duration; }

    .key.bitrate { grid-area: kbitrate; }
    .value.bitrate { grid-area: bitrate; }

    .key.size { grid-area: ksize; }
    .value.size { grid-area: size; }

    .key.samplerate { grid-area: ksamplerate; }
    .value.samplerate { grid-area: samplerate; }

    .key.year { grid-area: kyear; }
    .value.year { grid-area: year; } */

    .spacer {
        grid-area: spacer;
        position: relative;
        height: 1rem !important;
        margin: 0;
        margin-top: 8px;

        border-color: var(--text-tertiary);

        display: flex;
        align-items: flex-end;
        justify-content: center;
    }
    .closebtn {
        grid-area: closebtn;
        display: flex;
        justify-content: flex-end;
    }
</style>