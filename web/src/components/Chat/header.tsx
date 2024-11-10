import { useAtom } from "solid-jotai";
import HeaderButton from "./headerButton.tsx";
import { iconState } from "../../utils/state.ts";
import { isSelectRoomState } from "../../utils/roomState.ts";
export default function ChatHeader() {
  const [icon] = useAtom(iconState);
  const [isSelectRoom] = useAtom(isSelectRoomState);
  return (
    <>
      <header
        class={`l-header ${isSelectRoom() ? "is-inview" : ""}`}
        id="header"
      >
        <div class="l-header-logo">
          <a href="/talk">
            <img
              src={`data:image/png;base64,${icon()}`}
              alt="takos"
              class="rounded-full"
            />
          </a>
        </div>
        <ul class="l-header__ul">
          <HeaderButton
            page={"home"}
          >
            <a>
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                aria-labelledby="homeAltIconTitle"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              >
                <title id="homeAltIconTitle">Home</title>{" "}
                <path d="M3 10.182V22h18V10.182L12 2z" />{" "}
                <rect width="6" height="8" x="9" y="14" />
              </svg>
            </a>
          </HeaderButton>
          <HeaderButton
            page={"talk"}
          >
            <a>
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                aria-labelledby="chatIconTitle"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              >
                <title id="chatIconTitle">Chat</title>{" "}
                <path d="M8.82388455,18.5880577 L4,21 L4.65322944,16.4273939 C3.00629211,15.0013 2,13.0946628 2,11 C2,6.581722 6.4771525,3 12,3 C17.5228475,3 22,6.581722 22,11 C22,15.418278 17.5228475,19 12,19 C10.8897425,19 9.82174472,18.8552518 8.82388455,18.5880577 Z" />
              </svg>
            </a>
          </HeaderButton>
          <HeaderButton
            page={"notification"}
          >
            <a>
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                aria-labelledby="notificationIconTitle"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              >
                <title id="notificationIconTitle">Notification</title>
                <path d="M12 22C13.6569 22 15 20.6569 15 19H9C9 20.6569 10.3431 22 12 22Z" />
                <path d="M18 10V16L21 19H3L6 16V10C6 6.68629 8.68629 4 12 4C15.3137 4 18 6.68629 18 10Z" />
              </svg>
            </a>
          </HeaderButton>
          <HeaderButton
            page={"friend"}
          >
            <a>
              <svg
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
                aria-labelledby="personAddIconTitle"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              >
                <title id="personAddIconTitle">Add user</title>{" "}
                <path d="M1 18C1 15.75 4 15.75 5.5 14.25C6.25 13.5 4 13.5 4 9.75C4 7.25025 4.99975 6 7 6C9.00025 6 10 7.25025 10 9.75C10 13.5 7.75 13.5 8.5 14.25C10 15.75 13 15.75 13 18" />
                {" "}
                <path d="M22 11H14" /> <path d="M18 7V15" />
              </svg>
            </a>
          </HeaderButton>
          <HeaderButton
            page={"setting"}
          >
            <a>
              <svg
                role="img"
                xmlns="http://www.w3.org/2000/svg"
                width="100%"
                height="100%"
                viewBox="0 0 24 24"
                aria-labelledby="settingsIconTitle"
                stroke="#ffffff"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                fill="none"
              >
                <title id="settingsIconTitle">Settings</title>{" "}
                <path d="M5.03506429,12.7050339 C5.01187484,12.4731696 5,12.2379716 5,12 C5,11.7620284 5.01187484,11.5268304 5.03506429,11.2949661 L3.20577137,9.23205081 L5.20577137,5.76794919 L7.9069713,6.32070904 C8.28729123,6.0461342 8.69629298,5.80882212 9.12862533,5.61412402 L10,3 L14,3 L14.8713747,5.61412402 C15.303707,5.80882212 15.7127088,6.0461342 16.0930287,6.32070904 L18.7942286,5.76794919 L20.7942286,9.23205081 L18.9649357,11.2949661 C18.9881252,11.5268304 19,11.7620284 19,12 C19,12.2379716 18.9881252,12.4731696 18.9649357,12.7050339 L20.7942286,14.7679492 L18.7942286,18.2320508 L16.0930287,17.679291 C15.7127088,17.9538658 15.303707,18.1911779 14.8713747,18.385876 L14,21 L10,21 L9.12862533,18.385876 C8.69629298,18.1911779 8.28729123,17.9538658 7.9069713,17.679291 L5.20577137,18.2320508 L3.20577137,14.7679492 L5.03506429,12.7050339 Z" />
                {" "}
                <circle cx="12" cy="12" r="1" />
              </svg>
            </a>
          </HeaderButton>
        </ul>
      </header>
    </>
  );
}
