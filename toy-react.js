const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }

  update() {
    let isSameNode = (oldNode, newNode) => {
      if (oldNode.type !== newNode.type) {
        return false;
      }
      for (const name in newNode.props) {
        if (
          oldNode.props === null ||
          oldNode.props[name] !== newNode.props[name] ||
          Object.keys(oldNode.props).length > Object.keys(newNode.props).length
        ) {
          return false;
        }
        if (newNode.type === "#text" && newNode.content !== oldNode.content) {
          return false;
        }
      }
      return true;
    };
    let update = (oldNode, newNode) => {
      // type,props,children
      //#text, content
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }
      newNode._range = oldNode._range;

      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      if (!oldChildren || !newChildren) {
        return;
      }

      let tailRange = oldChildren[oldChildren.length - 1]._range;

      for (let i = 0; i < newChildren.length; i++) {
        const newChild = newChildren[i];
        const oldChild = oldChildren[i];
        if (i < oldChildren.length) {
          update(oldChild, newChild);
        } else {
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    };
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom;
  }

  // rerender() {
  //   const oldRange = this._range;

  //   let range = document.createRange();
  //   range.setStart(oldRange.startContainer, oldRange.startOffset);
  //   range.setEnd(oldRange.startContainer, oldRange.startOffset);
  //   this[RENDER_TO_DOM](range);

  //   oldRange.setStart(range.endContainer, range.endOffset);
  //   oldRange.deleteContents();
  // }

  setState(newState) {
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      this.update();
      return;
    }
    let merge = (oldState, state) => {
      for (const key in state) {
        // 深拷贝的必要性存疑？
        if (state[key] !== null && typeof state[key] === "object") {
          if (state[key] instanceof Array) {
            oldState[key] = [...state[key]];
          } else {
            merge(oldState[key], state[key]);
          }
        } else {
          oldState[key] = state[key];
        }
      }
    };
    merge(this.state, newState);
    this.update();
  }

  get vdom() {
    return this.render().vdom;
  }
}

class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type;
  }

  get vdom() {
    this.vchildren = this.children.map((child) => child.vdom);
    return this;
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    const root = document.createElement(this.type);
    for (let name in this.props) {
      const value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, (c) => c.toLowerCase()),
          value
        );
      } else {
        if (name === "className") {
          root.setAttribute("class", value);
        } else {
          root.setAttribute(name, value);
        }
      }
    }
    if (!this.vchildren) {
      this.vchildren = this.children.map((item) => item.vdom);
    }

    for (const child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }
    replaceContent(range, root);
  }
}

class TextWrapper extends Component {
  constructor(content) {
    super(content);
    this.content = content;
    this.type = "#text";
  }

  [RENDER_TO_DOM](range) {
    this._range = range;
    const root = document.createTextNode(this.content);
    replaceContent(range, root);
  }

  get vdom() {
    return this;
  }
}

function replaceContent(range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);
}

export function createElement(type, attributes, ...children) {
  let e;
  if (typeof type === "string") {
    e = new ElementWrapper(type);
  } else {
    e = new type();
  }
  for (const p in attributes) {
    e.setAttribute(p, attributes[p]);
  }
  let insertChildren = (children) => {
    for (const child of children) {
      if (typeof child === "string") {
        e.appendChild(new TextWrapper(child));
      } else if (typeof child === "object" && child instanceof Array) {
        insertChildren(child);
      } else if (child !== null) {
        e.appendChild(child);
      }
    }
  };
  insertChildren(children);
  return e;
}
export function render(component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}
