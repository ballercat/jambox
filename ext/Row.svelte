<script>
  export let id;
  export let contentType;
  export let index;
  export let start;
  export let url;
  export let response;
  export let request;
  export let received;
  export let duration;
  export let title;
  export let scaleFactor;
  export let statusCode;
  export let rowHeight;
  export let rowWidth;
  export let rowPadding;
  export let barOffset;
  export let minTime;
  export let onClick;
  export let aborted;

  let hover = false;

  const CONTENT_COLOR_MAP = {
    js: '#2cb',
    fetch: '#9d5',
    html: '#36b',
  };

  let font, fill, sizeText, cacheColor;

  $: {
    font = `${statusCode ? '' : 'italic '}10px sans-serif`;
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
>
  <rect
    width={rowWidth}
    height={rowHeight + rowPadding - 1}
    fill={index % 2 ? '#efefef' : '#fff'}
    strokeWidth={1}
    stroke={hover ? '#000' : '#fff'}
  />
  <rect width={2} height={rowHeight} fill={cacheColor} />
  <text
    x={5}
    y={0}
    dx={0}
    dy={rowHeight}
    style="font: {font}; fill: {fill};"
    textAnchor="start"
  >
    {title}
  </text>
  <text
    x={198}
    y={0}
    dy={rowHeight}
    style="font: {font}; fill: {fill};"
    textAnchor="start"
  >
    {statusCode ?? 'pending'}
  </text>
  <text
    x={220}
    y={0}
    dy={rowHeight}
    style="font: {font}; fill: {fill};"
    textAnchor="start"
  >
    {contentType ?? ''}
  </text>
  <text
    x={250}
    y={0}
    dy={rowHeight}
    style="font: {font}; fill: {fill};"
    textAnchor="start"
  >
    {sizeText}
  </text>
  <g transform={`translate(${barOffset}, 0)`}>
    <title>
      {JSON.stringify({
        url: url.toString(),
        start,
        received,
        duration: duration ?? 'pending',
      })}
    </title>
    <rect
      x={(start - minTime) / scaleFactor}
      y={6}
      width={received}
      height={rowHeight - 12}
      style="fill: #e94;"
    />
    {#if duration}
      <rect
        x={(start - minTime) / scaleFactor + received}
        y={2}
        rx={1}
        width={duration / scaleFactor}
        height={rowHeight - 4}
        style="fill: {CONTENT_COLOR_MAP[contentType] || '#639'}"
      />
    {/if}
  </g>
</g>
