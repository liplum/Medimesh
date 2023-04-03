import './playground.css'
import React, { useContext, useEffect, useRef, useState } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"
import { AstrologyContext, BackendContext, ResponsiveAppBar, SelectedFileContext } from './dashboard';
import { Tooltip, IconButton, Typography, CircularProgress, Chip } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from './env';
import useForceUpdate from 'use-force-update';
import { i18n } from './i18n';
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Failed } from './loading';
import { filesize } from "filesize";
import { VideoJS } from "./video-player"
import videojs from "video.js";

const type2Render = {
  "video/mp4": VideoRenderer,
  "image/png": ImageRenderer,
  "image/jpeg": ImageRenderer,
  "image/svg+xml": ImageRenderer,
  "image/gif": ImageRenderer,
  "image/webp": ImageRenderer,
  "audio/mpeg": AudioRenderer,
  "audio/ogg": AudioRenderer,
  "text/markdown": MarkdownRenderer,
  "text/plain": PlainTextRenderer,
  "application/x-mpegURL": VideoRenderer,
}

export function FileDisplayBoard(props) {
  const { isStarred, star, unstar } = useContext(AstrologyContext)
  const { baseUrl, passcode } = useContext(BackendContext)
  const [file] = useContext(SelectedFileContext)
  const boardRef = useRef()
  const forceUpdate = useForceUpdate()
  let content = null
  if (file) {
    if (!file.url) {
      file.url = backend.reolsveFileUrl(baseUrl, file.path, passcode)
    }
    const Renderer = type2Render[file.type]
    // wheel control works so bad when using trackpad.
    content = <div
      ref={boardRef}
      onMouseDown={(e) => {
        if (!isMobile) return
        const { clientX } = e
        const { left, width } = boardRef.current.getBoundingClientRect()

        if (clientX < left + width / 2) {
          // left side
          goPreviousFile(file)
        } else {
          // right side
          goNextFile(file)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === "ArrowLeft") {
          goPreviousFile(file)
          e.preventDefault()
        } else if (e.key === "ArrowRight") {
          goNextFile(file)
          e.preventDefault()
        }
      }}
      tabIndex="0"
      className="board">
      {
        Renderer
          ? <Renderer file={file} />
          : <h1>Cannot display this file.</h1>
      }
    </div>
  }
  const isFileStarred = isStarred(file)
  return <>
    <ResponsiveAppBar>
      <Tooltip title={file?.path}>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          {file ? file.name : "No file selected"}
        </Typography>
      </Tooltip>
      {file && // only display if any file is selected
        <>
          {file.size && // only display if file has size property
            <Chip label={filesize(file.size, { base: 2, standard: "jedec" })} />
          }
          <Tooltip title={
            isFileStarred ? i18n.playground.unstarBtn
              : i18n.playground.starBtn
          }>
            <IconButton onClick={() => {
              if (isFileStarred) unstar(file)
              else star(file)
              forceUpdate()
            }}>
              {isFileStarred ? <Star /> : <StarBorder />}
            </IconButton>
          </Tooltip>
        </>
      }
    </ResponsiveAppBar>
    <ErrorBoundary fallback={<Failed text={i18n.playground.failedToDisplay} />}>
      {content}
    </ErrorBoundary>
  </>
}

function VideoRenderer({ file }) {
  const { passcode } = useContext(BackendContext)
  useEffect(() => {
    videojs.Vhs.xhr.beforeRequest = function (options) {
      options.uri = backend.suffixWithPasscode(options.uri, passcode)
      return options;
    }
  }, [passcode])

  const videoJsOptions = {
    autoplay: false,
    controls: true,
    responsive: true,
    fluid: true,
    playbackRates: [0.1, 0.5, 1, 1.5, 2, 3, 5, 10],
    sources: [{
      src: file.url,
      type: file.type,
    }],
  };

  return <VideoJS
    options={videoJsOptions}
    onMouseDown={(event) => {
      event.stopPropagation();
    }}
  />
}
function ImageRenderer({ file }) {
  return <img
    src={file.url}
    alt={file.path}
    className={"img-view"} />
}

function AudioRenderer({ file }) {
  return <audio
    controls
    src={file.url}
    alt={file.path}
    onMouseDown={(event) => {
      event.stopPropagation();
    }}
    className={"video-view"} />
}

function MarkdownRenderer({ file }) {
  const pathParts = file.path.split("/")
  pathParts.pop()
  return <Markdown
    src={file.url}
    alt={file.path}
    parentDir={pathParts.join("/")}
  />
}
function Markdown({ src, alt, parentDir }) {
  const [markdown, setMarkdown] = useState()
  const { baseUrl, passcode } = useContext(BackendContext)

  useEffect(() => {
    fetch(src)
      .then(response => response.text())
      .then(text => setMarkdown(text))
      .catch(() => setMarkdown(alt))
  }, [src])
  if (!markdown) {
    return <CircularProgress />
  } else {
    // TODO: Better scrolling
    return <div style={{ height: "90%", overflow: "auto" }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        transformImageUri={uri => {
          if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return uri
          } else {
            return backend.reolsveFileUrl(baseUrl, `${parentDir}/${uri}`, passcode)
          }
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  }
}


function PlainTextRenderer(file) {
  const [text, setText] = useState()

  useEffect(() => {
    fetch(file.url)
      .then(response => response.text())
      .then(text => setText(text))
      .catch(() => setText(null))
  }, [file.url])

  if (!text) {
    return <CircularProgress />
  } else {
    return <Typography variant="p" component="div"
      style={{
        whiteSpace: 'pre-wrap',
        overflowWrap: 'break-word',
        height: "90%", overflow: "auto"
      }}>
      {text ?? file.path}
    </Typography>
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error)
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback;
    }

    return this.props.children;
  }
}
