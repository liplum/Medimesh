import './playground.css'
import React, { useRef } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
  "audio/mpeg": renderAudio,
  "audio/ogg": renderAudio,
}
export function FileDisplayBoard(props) {
  const boardRef = useRef()
  const file = props.file
  const onMouseDown = (e) => {
    if (!isMobile) return
    const { clientX } = e;
    const { left, width } = boardRef.current.getBoundingClientRect();

    if (clientX < left + width / 2) {
      // left side
      goPreviousFile(file)
    } else {
      // right side
      goNextFile(file)
    }
  }
  const onWheel = (e) => {
    if (isMobile) return
    if (e.deltaY > 0) {
      // wheel down
      goNextFile(file)
    } else if (e.deltaY < 0) {
      // wheel up
      goPreviousFile(file)
    }
  }
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      goPreviousFile(file)
    } else if (e.key === "ArrowRight") {
      goNextFile(file)
    }
  }
  if (!file) {
    return <h1>No file selected</h1>
  }
  const renderer = type2Render[file.type]

  return <div
    ref={boardRef}
    onMouseDown={onMouseDown}
    onWheel={onWheel}
    onKeyDown={onKeyDown}
    tabIndex="0"
    style={{
      width: "100%",
      height: "100%",
    }}>
    {
      renderer ?
        renderer(file) :
        <h1>Cannot display this file.</h1>
    }
  </div>
}

function renderVideo(file) {
  return <video controls
    src={file.url}
    autoPlay
    onMouseDown={(event) => {
      event.stopPropagation();
    }}
    className={"video-view"} />
}

function renderImage(file) {
  return <img
    src={file.url}
    alt={file.path}
    className={"img-view"} />
}

function renderAudio(file) {
  return <audio
    controls
    src={file.url}
    alt={file.path}
    className={"video-view"} />
}