document.onreadystatechange = () => {
  if (document.readyState !== "complete") return;
  document.querySelector(".loader").style.opacity = "0";
  document.body.style.background = `url(./img/bg.jpg) repeat fixed top center`;
  document.body.style.backgroundColor = "var(--teal3)";
  document.querySelector(".container").style.display = "flex";
  setTimeout(() => {
    document.querySelector(".loader").style.display = "none";
  }, 500);
};

const loaderStylesheet = `
.loader {
    background-color: #eee;
    opacity: 1;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    z-index: 99999999;
    transition: opacity 300ms ease-out;
  }
  .loader_ellipsis {
    display: inline-block;
    position: absolute;
    position: relative;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    height: 39px;
    width: 57px;
  }
  .loader_ellipsis div {
    position: absolute;
    top: 27px;
    background: #ccc;
    border-radius: 50%;
    width: 11px;
    height: 11px;
    animation-timing-function: cubic-bezier(0, 1, 1, 0);
  }
  .loader_ellipsis div:first-child {
    animation: loader_ellipsis1 600ms infinite;
    left: 4px;
  }
  .loader_ellipsis div:nth-child(2) {
    animation: loader_ellipsis2 600ms infinite;
    left: 4px;
  }
  .loader_ellipsis div:nth-child(3) {
    left: 26px;
    animation: loader_ellipsis2 600ms infinite;
  }
  .loader_ellipsis div:last-child {
    animation: loader_ellipsis3 600ms infinite;
    left: 45px;
  }
  @keyframes loader_ellipsis1 {
    0% {
      transform: scale(0);
    }
    100% {
      transform: scale(1);
    }
  }
  @keyframes loader_ellipsis2 {
    0% {
      transform: translate(0, 0);
    }
    100% {
      transform: translate(19px, 0);
    }
  }
  @keyframes loader_ellipsis3 {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(0);
    }
  }
`;

let loaderStyle = document.createElement("style");
loaderStyle.innerText = loaderStylesheet.trim().replace(/\r?\n|\r|\s\s+/g, "");
document.head.appendChild(loaderStyle);
