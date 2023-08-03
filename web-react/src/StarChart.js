export class StarChart {
  #path2Star = {}
  star(path) {
    if (this.#path2Star[path]) return
    // `1` instead of `true` to shrink the json size
    this.#path2Star[path] = 1
    this.save()
  }

  unstar(path) {
    if (!this.#path2Star[path]) return
    delete this.#path2Star[path]
    this.save()
  }

  isStarred(path) {
    return Boolean(this.#path2Star[path])
  }

  save() {
    window.localStorage.setItem("star-chart", JSON.stringify(this.#path2Star))
  }

  load() {
    const json = window.localStorage.getItem("star-chart")
    this.#path2Star = json ? JSON.parse(json) ?? {} : {}
  }
}
