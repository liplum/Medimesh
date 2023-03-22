import './playground.css'
import React, { useContext, useRef } from 'react'
import { goNextFile, goPreviousFile } from "./event";

import { isMobile } from "react-device-detect"
import { AstrologyContext, BackendContext, ResponsiveAppBar, SelectedFileContext } from './dashboard';
import { Tooltip, IconButton, Typography } from "@mui/material"
import { StarBorder, Star } from '@mui/icons-material';
import { backend } from './env';
import useForceUpdate from 'use-force-update';
import { i18n } from './i18n';

const type2Render = {
  "video/mp4": renderVideo,
  "image/png": renderImage,
  "image/jpeg": renderImage,
  "audio/mpeg": renderAudio,
  "audio/ogg": renderAudio,
}

export function FileDisplayBoard(props) {
  const { isStarred, star, unstar } = useContext(AstrologyContext)
  const { baseUrl, passcode } = useContext(BackendContext)
  const [file] = useContext(SelectedFileContext)
  const boardRef = useRef()
  const forceUpdate = useForceUpdate()
  const onMouseDown = (e) => {
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
  }
  const onKeyDown = (e) => {
    if (e.key === "ArrowLeft") {
      goPreviousFile(file)
      e.preventDefault()
    } else if (e.key === "ArrowRight") {
      goNextFile(file)
      e.preventDefault()
    }
  }
  let content = null
  if (file) {
    if (!file.url) {
      file.url = backend.reolsveFileUrl(baseUrl, file.path, passcode)
    }
    const renderer = type2Render[file.type]
    // wheel control works so bad when using trackpad.
    content = <div
      ref={boardRef}
      onMouseDown={onMouseDown}
      onKeyDown={onKeyDown}
      tabIndex="0"
      className="board">
      {
        renderer ?
          renderer(file) :
          <h1>Cannot display this file.</h1>
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
      }
    </ResponsiveAppBar>
    {content}
  </>
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