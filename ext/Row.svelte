<script>
  export let id;
  export let contentType;
  export let index;
  export let url;
  export let response;
  export let request;
  export let title;
  export let scaleFactor;
  export let rowHeight;
  export let rowPadding;
  export let barOffset;
  export let minTime;
  export let onClick;
  export let aborted;

  let statusCode, start, received, duration;
  let hover = false;

  const CONTENT_COLOR_MAP = {
    js: '#2cb',
    fetch: '#9d5',
    html: '#36b',
    css: '#09c',
  };

  let font, fill, sizeText, cacheColor;

  $: {
    statusCode = response?.statusCode || null;
    start = Math.ceil(request.startTimestamp);
    received = Math.ceil(
      request.bodyReceivedTimestamp - request.startTimestamp
    );
    duration = response?.responseSentTimestamp
      ? Math.ceil(response.responseSentTimestamp - request.startTimestamp)
      : null;
    font = `${statusCode ? '' : 'italic '} 1rem sans-serif`;
    fill = statusCode && statusCode >= 400 ? '#a35' : 'black';

    sizeText = (() => {
      const size = response?.sizeInBytes || 0;
      if (size <= 124) {
        return `${size}B`;
      }

      if (size >= 1024 * 100) {
        return `${(size / 1024 / 1000).toFixed(1)}MB`;
      }

      return `${(size / 1024).toFixed(1)}KB`;
    })();

    cacheColor = (() => {
      if (request.cached) {
        return '#4d8';
      }

      if (request.staged) {
        return '#36b';
      }

      return '#aaa';
    })();

    if (aborted) {
      statusCode = 'Aborted';
      sizeText = '';
      contentType = '';
      fill = '#a35';
    }
  }

  const handleSelect = (e) => {
    e.preventDefault();
    onClick(id);
  };
</script>

<g
  on:click={handleSelect}
  on:keypress={handleSelect}
  on:mouseenter={() => (hover = true)}
  on:mouseleave={() => (hover = false)}
  transform={`translate(0,${(index + 1) * (rowHeight + rowPadding)})`}
  style="cursor: pointer;"
  opacity={statusCode ? 1 : 0.5}
  data-cy-id={url.toString()}
>
  <title>
    {JSON.stringify(
      {
        url: url.toString(),
        start,
        received,
        duration: duration ?? 'pending',
      },
      null,
      2
    )}
  </title>
  <rect
    width="100%"
    strokeWidth={1}
    style={`height: calc(100% + ${rowPadding - 1}px); fill: ${
      index % 2 ? 'var(--stripeA)' : 'var(--stripeB)'
    }; stroke: ${hover ? 'var(--backGroundColor)' : 'var(---textColor)'};`}
  />
  <rect width={2} height="100%" fill={cacheColor} />
  <text
    x="5"
    y={0}
    dx={0}
    dy={rowHeight}
    style={`padding: 5px; font: ${font}; fill: ${
      (statusCode && statusCode >= 400) || aborted
        ? 'var(--aborted)'
        : 'var(--textColor)'
    }`}
    textAnchor="start"
  >
    {title}
  </text>
  <text
    x="250"
    y={0}
    dy={rowHeight}
    style={`padding: 5px; font: ${font}; fill: ${
      (statusCode && statusCode >= 400) || aborted
        ? 'var(--aborted)'
        : 'var(--textColor)'
    }`}
    textAnchor="start"
  >
    {statusCode ?? 'pending'}
  </text>
  <text
    x="315"
    y={0}
    dy={rowHeight}
    style={`padding: 5px; font: ${font}; fill: ${
      (statusCode && statusCode >= 400) || aborted
        ? 'var(--aborted)'
        : 'var(--textColor)'
    }`}
    textAnchor="start"
  >
    {contentType ?? ''}
  </text>
  <text
    x="370"
    y={0}
    dy={rowHeight}
    style={`padding: 5px; font: ${font}; fill: ${
      (statusCode && statusCode >= 400) || aborted
        ? 'var(--aborted)'
        : 'var(--textColor)'
    }`}
    textAnchor="start"
  >
    {sizeText}
  </text>
  <g transform={`translate(${barOffset}, 0)`}>
    <rect
      x={`${(start - minTime) / scaleFactor + 435}`}
      y={6}
      width={received}
      height={rowHeight - 12}
      style="fill: #e94;"
    />
    {#if duration}
      <rect
        x={`${(start - minTime) / scaleFactor + received + 435}`}
        y={2}
        rx={1}
        width={duration / scaleFactor}
        height={rowHeight - 4}
        style="fill: {CONTENT_COLOR_MAP[contentType] || '#639'}"
      />
    {/if}
  </g>
</g>
