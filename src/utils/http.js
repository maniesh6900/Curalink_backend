import { ApiError } from "./ApiError.js";

export const fetchJson = async (url, init = {}, errorMessage = "Request failed") => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ApiError(response.status, `${errorMessage}: ${response.statusText}`);
  }

  return response.json();
};

export const fetchText = async (url, init = {}, errorMessage = "Request failed") => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new ApiError(response.status, `${errorMessage}: ${response.statusText}`);
  }

  return response.text();
};
