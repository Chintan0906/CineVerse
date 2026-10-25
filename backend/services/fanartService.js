const BASE_URL = "https://webservice.fanart.tv/v3";

async function getMovieArtwork(imdbID) {
  const apiKey = process.env.FANART_API_KEY;

  if (!apiKey) {
    throw new Error("FANART_API_KEY is missing from backend/.env");
  }

  if (!imdbID || !/^tt\d+$/.test(imdbID)) {
    throw new Error("A valid IMDb ID is required.");
  }

  const url = `${BASE_URL}/movies/${imdbID}`;

  const response = await fetch(url, {
    headers: {
      "api-key": apiKey,
    },
  });

  if (response.status === 404) {
    return {
      poster: "",
      backdrop: "",
      logo: "",
    };
  }

  if (!response.ok) {
    throw new Error(`Fanart.tv HTTP error: ${response.status}`);
  }

  const data = await response.json();

  // Select the first available image from each category.
  const poster = data.movieposter?.[0]?.url || "";
  const backdrop = data.moviebackground?.[0]?.url || "";
  const logo = data.hdmovielogo?.[0]?.url || "";

  return {
    poster,
    backdrop,
    logo,
  };
}

module.exports = {
  getMovieArtwork,
};