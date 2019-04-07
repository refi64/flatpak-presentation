const { series, src, dest, watch } = require('gulp')
const { Marpit } = require('@marp-team/marpit')
const htmlPdf = require('html-pdf-chrome')
const through = require('through2')
const Vinyl = require('vinyl')
const fs = require('fs')
const path = require('path')

let marpit = () => through.obj((file, enc, cb) => {
  let marpit = new Marpit()

  let md = file.contents.toString()
  if (md.startsWith('```css')) {
    let [entireMatch, theme] = md.match(/```css([^`]+)```\s*/);
    marpit.themeSet.default = marpit.themeSet.add(theme)

    md = md.substring(entireMatch.length)
  }

  let { html, css, comments } = marpit.render(md)

  let result = `<!DOCTYPE html>
<head>
  <style>
    ${css}
  </style>
</head>

<body>
  ${html}
</body>
`

  file.contents = Buffer.from(result)
  file.path = file.path.replace(/\.md$/, '.html')
  cb(null, file)
})

let pdf = () => through.obj((file, enc, cb) => {
  let options = {
    port: 9222,
    printOptions: {
      preferCSSPageSize: true,
    },
  }
  htmlPdf.create(file.contents.toString(), options).then((pdf) => {
    file.contents = pdf.toBuffer()
    file.path = file.path.replace(/\.html$/, '.pdf')
    cb(null, file)
  })
})

const SOURCE = 'presentation.md'

function buildHtml() {
  return src(SOURCE)
    .pipe(marpit())
    .pipe(dest('build/'))
}

function buildPdf() {
  return src('build/presentation.html')
    .pipe(pdf())
    .pipe(dest('build/'))
}

exports.default = buildHtml
exports.pdf = series(buildHtml, buildPdf)
exports.onlypdf = buildPdf
exports.watch = () => watch(SOURCE, buildHtml)
