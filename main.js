import { createElement, Component, render } from "./toy-react";

class MyComponent extends Component {
  render() {
    return (
      <div>
        my component
        {this.children}
      </div>
    );
  }
}

render(
  <MyComponent id="a" class="c">
    <div>abc</div>
    <div></div>
    <div></div>
  </MyComponent>,
  document.body
);
