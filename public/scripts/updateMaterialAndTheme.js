var UpdateMaterialAndTheme = pc.createScript("updateMaterialAndTheme");

UpdateMaterialAndTheme.attributes.add("showErrorScreen", {
  type: "boolean",
  default: false,
});

UpdateMaterialAndTheme.attributes.add("logoEntity", {
  name: "logo Entity",
  type: "entity",
});

UpdateMaterialAndTheme.attributes.add("taglineMaxCharacters", {
  name: "tagline max characters in one line",
  type: "number",
  default: 32,
});

UpdateMaterialAndTheme.attributes.add("themeEntityList", {
  type: "json",
  array: true,
  schema: [
    {
      name: "entity",
      type: "entity",
    },
    {
      name: "materialsToSwitch",
      array: true,
      type: "number",
    },
  ],
});

var ApiUrl = "https://3d-experience.exarta.com/";
// var ApiUrl = 'http://localhost:4000/'
var devMode = false;
var experienceId;
var accessToken = "";
var packageId = "fre";
var isAdmin = true;
var shopId = "";
const productData = [];
const collectionData = [];
const finalData = [];
var imageLoadedCount = 0;
var selectedTheme = 0;
var settings = {};
var productImageEntityList = [];
var logo_plane;
let showCollections = false;

// initialize code called once per entity
UpdateMaterialAndTheme.prototype.initialize = function () {
  this.width = window.innerWidth;
  this.thresholdValue = this.width < 1000 ? 250 : 1000;
  window.oncontextmenu = (e) => {
    e.preventDefault();
    console.log("right clicked");
  };
  this.app.loader.getHandler("texture").crossOrigin = "anonymous";
  camera_entity = this.app.root.findByName("Camera");
  // productImageEntityList = this.app.root.findByTag("image_planes")[0].children;
  productImageEntityList = this.app.root.findByTag("image_plane");
  // console.log("imageEntityList",imageEntityList)
  // logo_plane = this.app.root.findByTag("logo_plane")[0];
  // console.log("productImageEntityList", productImageEntityList);
  // console.log("logo_plane", logo_plane);

  const url = window.location.href;
  // const url = "https://launch.playcanvas.com/1916047?debug=true"; // "https://dwffbzjamvzk3.cloudfront.net/odyssey-experiences/1/"
  const projectIdMap = {
    1992738: "1",
    1803850: "2",
    1824908: "3",
    1760432: "4",
    1824583: "5",
    1871069: "6",
    1835720: "7",
    1834130: "8",
    1842917: "9",
    1843044: "10",
    1781051: "11",
    1903379: "12",
    1903327: "13",
    1900183: "14",
    1908752: "15",
    1922258: "16",
    1916113: "17",
    1916047: "18",
    1917440: "19",
    1923594: "20",
    1900862: "21",
    1915292: "22",
    1922276: "23",
    1924183: "24",
    1927343: "25",
    1922952: "26",
    1928538: "27",
    1929497: "28",
    1927428: "29",
    1938660: "30",
    2027872: "31",
    2027877: "32",
    2027878: "33",
    2027879: "34",
    2027880: "35",
    2027881: "36",
    2027883: "37",
    2031834: "38",
    2031810: "39",
    2030997: "40",
    2030839: "41",
    2031848: "42",
    2033416: "43",
    2036592: "44",
    2036724: "45",
    2037411: "46",
    2037475: "47",
    2037485: "48",
    2037483: "49",
    2039981: "50",
    2038741: "1001",
    2040105: "1002",
    2040098: "1003",
    2042990: "1004",
    2047130: "1005",
    2048771: "1006",
    2051648: "1007",
    2063676: "1008",
    2043560: "1009",
    2045095: "1010",
    2044397: "1011",
    2047063: "1012",
    2048133: "1013",
    2050938: "1014",
    2051464: "1015",
    2050714: "1016",
    2053070: "1017",
    2059674: "1018",
    2055539: "1019",
    2053687: "1020",
    2063668: "1021",
    2059924: "1022",
    2071854: "1023",
  };

  if (url.includes("playcanvas.com")) {
    devMode = true;
    const projectId = url.split("/")[3].slice(0, 7);
    experienceId = projectIdMap[projectId];
  } else {
    experienceId = url.split("/")[4];
  }
  this.handleInitialDataFetching();
};

UpdateMaterialAndTheme.prototype.handleInitialDataFetching = function () {
  // var self = this;
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  shopId = devMode ? "63180439721" : searchParams.get("shopId");
  console.log("STOREID: ", shopId);
  let themeId = searchParams.get("themeId");
  console.log("ThemeId: ", themeId);
  const filter = searchParams.get("filter");
  console.log("filter:", filter);
  accessToken = searchParams.get("accessToken");
  console.log("accessToken: ", accessToken);
  const currentStore = getStoreNumber(url);

  let productsLength = 0;
  let collectionsLength = 0;
  let finalData = [];
  let dataLength = 0;

  if (!shopId && this.showErrorScreen) {
    setTimeout(() => {
      const container = document.querySelector("#mainContainer404");
      container.style.display = "block";
      const splashLoader = document.querySelector(
        "#application-splash-wrapper"
      );
      splashLoader.style.display = "none";
    }, 1000);
    return;
  }

  axios
    .get(`https://shopify-3d.exarta.com/get-shop-data/${shopId}`)
    .then((response) => {
      const data = response.data.data;
      console.log("api response", response.data.data);
      if (!data || !data.settings || !data.shopData) {
        throw new Error("Invalid or empty data received from the server.");
      }
      this.app.fire("joyStick", {
        enableHud: data.settings.enableHud ? data.settings.enableHud : false,
      });

      devMode &&
        this.app.fire("authOptions", {
          isAdmin: true,
          packageId: "fre",
          autoLinking: false,
        });

      const settings = data.settings;
      this.settings = settings;
      // packageId = devMode ? "fre" : data.package ? data.package : packageId;
      // devMode &&
      //   axios
      //     .get(`${ApiUrl}verifytoken/${shopId}?token=${accessToken}`)
      //     .then((response) => {
      //       isAdmin = response?.data?.isAdmin;
      //       this.app.fire("authOptions", {
      //         isAdmin,
      //         packageId,
      //         autoLinking: settings?.autoLinking,
      //       });
      //     })
      //     .catch((err) =>
      //       this.app.fire("authOptions", {
      //         isAdmin,
      //         packageId,
      //         autoLinking: settings?.autoLinking,
      //       })
      //     );

      console.log("settings:", settings);

      if (filter) {
        showCollections = filter === "collections" ? true : false;
      } else {
        showCollections =
          settings.selectedFilter === "collections" ? true : false;
      }

      // let products = data?.shopData?.products.filter((prod) =>
      //   prod?.status ? prod?.status.toLowerCase() === "active" : prod
      // );

      let products = data?.shopData?.products.filter((prod) => {
        const inPreview = prod.onlineStorePreviewUrl
          ? hasPreviewParam(prod.onlineStorePreviewUrl)
          : false;
        if (inPreview) return false;
        return prod?.status ? prod?.status.toLowerCase() === "active" : false;
      });

      console.log("products after filter", products);
      const initial_product_url = `${data.shopData.store.domains[0].url}/products/`;
      console.log("initial_product_url", initial_product_url);

      let collections = data.shopData.collections;
      const initial_collection_url = `${data.shopData.store.domains[0].url}/collections/`;
      console.log("initial_collection_url", initial_collection_url);

      // Handle Theme Changing through query param

      console.log("themeId", themeId);
      themeId = themeId ? themeId : settings.selectedTheme + 1;
      this.handleThemeChange(themeId);

      // Handle Currency to be shown on UI
      const currencyFormat =
        data.shopData.store.currencyFormats?.moneyFormat.replace(
          /{{.*?}}/g,
          ""
        );
      const moneyFormat = currencyFormat.split(/\s+/)[1] || currencyFormat;
      console.log("money Format:", moneyFormat);

      const filterSelected = showCollections ? "COLLECTION" : "PRODUCT";
      let itemTitle = `${filterSelected} : Name`;

      this.handleLogoEntityChildren(
        this.logoEntity.children,
        settings.logo,
        settings.storeTagLine
      );

      // if (settings.logo) {
      //   console.log("Settings:", settings);
      //   this.handleLogoUpdate(this.logoEntity.children[0], settings.logo);
      // }

      // if (settings.storeTagLine) {
      //   let tagline = settings.storeTagLine;
      //   let formatedTagline = addNewlinesToTagline(
      //     tagline,
      //     this.taglineMaxCharacters
      //   );
      //   this.logoEntity.children[1].element.text = formatedTagline;
      // }

      // Handle products Data
      if (!showCollections && products && products.length > 0) {
        productsLength =
          productImageEntityList.length > products.length
            ? products.length
            : productImageEntityList.length;
        console.log(
          "productImageEntityList.length",
          productImageEntityList.length
        );
        products = getRandomSubset(
          products,
          productsLength,
          !settings.autoLinking
        );
        if (products.length < productImageEntityList.length) {
          console.log("here", products.length, productImageEntityList.length);
          const extraProducts = getRandomUniqueIndexes(
            products,
            productImageEntityList.length - products.length
          );
          console.log("extra products", extraProducts);
          for (let product of extraProducts) {
            products.push(products[product]);
          }
        }
        console.log("Products", products);
        products.forEach((p) => {
          const url =
            p.images?.edges[0]?.node?.url ||
            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png?format=jpg&quality=90&v=1530129081";
          const width = p.images?.edges[0]?.node?.width;
          const height = p.images?.edges[0]?.node?.height;
          if (!url) return;
          const newUrl = modifyImageUrl(url, this.thresholdValue);
          productData.push({
            title: p.title,
            price: p.variants.edges[0].node.price,
            url: newUrl,
            link: initial_product_url + p.handle,
            width,
            height,
            type: p.productType || "",
          });
        });
        console.log("Products Data:", productData);
      } else if (!showCollections) {
        console.log("No Products data", productData);
        this.app.fire("startNow");
      }

      // Handle Collections Data
      if (showCollections && collections && collections.length > 0) {
        collectionsLength =
          productImageEntityList.length > collections.length
            ? collections.length
            : productImageEntityList.length;
        console.log("In collection block");
        console.log(
          "productImageEntityList.length",
          productImageEntityList.length
        );
        console.log("collections.length", collections.length);
        collections = getRandomSubset(
          collections,
          collectionsLength,
          !settings.autoLinking
        );
        if (collections.length < productImageEntityList.length) {
          console.log(
            "here",
            collections.length,
            productImageEntityList.length
          );
          const extraCollections = getRandomUniqueIndexes(
            collections,
            productImageEntityList.length - collections.length
          );
          console.log("extra collections", extraCollections);
          for (let collection of extraCollections) {
            collections.push(collections[collection]);
          }
        }

        collections.forEach((c) => {
          const url =
            c?.image?.url ||
            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png?format=jpg&quality=90&v=1530129081";
          const width = c?.image?.width;
          const height = c?.image?.height;
          if (!url) return;
          const newUrl = modifyImageUrl(url, this.thresholdValue);
          collectionData.push({
            title: c.title,
            url: newUrl,
            width,
            height,
            link: initial_collection_url + c.handle,
            isCollection: true,
          });
        });
        console.log("Collections Data:", collectionData);
      } else if (showCollections) {
        console.log("No Collections data");
        this.app.fire("startNow");
      }

      // Handle Product / Collection Image Update
      finalData = showCollections ? collectionData : productData;
      dataLength = showCollections ? collectionsLength : productsLength;

      console.log("final data", finalData);

      if (!finalData || finalData.length === 0) {
        console.log("No data");
        for (let i = 0; i < productImageEntityList.length; i++) {
          try {
            const title = finalData[i]?.title || "Name";
            const titleEntity = productImageEntityList[i].children[2];
            if (titleEntity && titleEntity?.name.includes("Title")) {
              itemTitle = `${filterSelected} : ${title}`;
              this.handleTitleUpdate(titleEntity, itemTitle);
            }
          } catch (err) {
            console.log("Error updating entity:", err, i);
          }
        }

        return;
      }
      for (let i = 0; i < productImageEntityList.length; i++) {
        try {
          const imageUrl =
            finalData[i]?.url ||
            "https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-image_large.png?format=jpg&quality=90&v=1530129081";
          const imageWidth = finalData[i]?.width;
          const imageHeight = finalData[i]?.height;
          this.app.fire(`setProductData-${i + 1}`, finalData[i], moneyFormat);
          const title = finalData[i]?.title || "Name";
          this.handleImageEntityChildren(
            imageUrl,
            productImageEntityList[i].children,
            dataLength,
            filterSelected,
            title,
            imageWidth,
            imageHeight
          );

          // console.log("image Entity:", entity);
        } catch (err) {
          console.log("Error updating entity:", err, i);
        }
      }
    })
    .catch((error) => {
      console.error("Error fetching data:", error.message);
      const container = document.getElementById("mainContainer404");
      if (container && this.showErrorScreen) {
        container.style.display = "block";
      }
    });
};

UpdateMaterialAndTheme.prototype.handleLogoEntityChildren = function (
  childrens,
  logo,
  tagline
) {
  console.log("childs", childrens);
  for (let c = 0; c < childrens.length; c++) {
    if (childrens[c].name.includes("Tag")) {
      let formatedTagline = addNewlinesToTagline(
        tagline,
        this.taglineMaxCharacters
      );
      childrens[c].element.text = formatedTagline;
      console.log("Formatted Tag line", formatedTagline);
    }

    if (
      childrens[c].name.includes("Image") ||
      childrens[c].name.includes("Item")
    ) {
      this.handleLogoUpdate(childrens[c], logo);
    }
  }
};

UpdateMaterialAndTheme.prototype.handleImageEntityChildren = function (
  imageUrl,
  childrens,
  dataLength,
  filterSelected,
  title,
  imageWidth,
  imageHeight
) {
  console.log("childs", childrens);
  for (let c = 0; c < childrens.length; c++) {
    if (childrens[c].name.includes("Title")) {
      const itemsTitle = `${filterSelected} : ${title}`;
      this.handleTitleUpdate(childrens[c], itemsTitle);
    }

    if (
      childrens[c].name.includes("Image") ||
      childrens[c].name.includes("Item")
    ) {
      this.handleImageUpdate(
        childrens[c],
        imageUrl,
        dataLength,
        imageWidth,
        imageHeight
      );
    }
  }
};

UpdateMaterialAndTheme.prototype.handleImageUpdate = function (
  entity,
  imageUrl,
  length,
  imageWidth,
  imageHeight
) {
  try {
    console.log("entity Before", entity);
    // const { width, height } = reduceResolutionWithAspectRatio(
    //   imageWidth,
    //   imageHeight,
    //   this.thresholdValue
    // );
    console.log("imageWidth, imageHeight", imageWidth, imageHeight);
    var image = new Image();
    image.crossOrigin = "anonymous"; // This is critical when loading image from a different domain
    image.onload = function () {
      var texture = new pc.Texture(this.app.graphicsDevice, {
        magFilter: pc.FILTER_LINEAR,
        minFilter: pc.FILTER_LINEAR,
      });
      texture.setSource(image);
      console.log("new Texture", texture);
      entity.c.element.texture = texture;
      entity.c.element.texture.upload();
      // var material = entity.render._material;
      // material._diffuseMap = texture;
      // material._emissiveMap = texture;
      // material._opacityMap = texture;
      // material._opacity = 1;
      // console.log('Material', material);
      // material.update();
      console.log("Entity after update:", entity);
      imageLoadedCount++;
      if (imageLoadedCount === length) {
        setTimeout(() => {
          this.app.fire("startNow");
        }, 2000);
      }
    }.bind(this);
    image.onerror = function (err) {
      console.log("Error Loading Image", err);
      this.app.fire("startNow");
    }.bind(this);
    console.log("Setting img src", imageUrl);
    image.src = imageUrl;
    image.style.objectFit = "cover";
    image.width = imageWidth;
    image.height = imageHeight;
  } catch (err) {
    console.log("imageUpdate error", err.message);
  }
};

UpdateMaterialAndTheme.prototype.handleTitleUpdate = function (
  titleEntity,
  title
) {
  console.log("product : title", title);

  try {
    const maxLength = 40;
    const updatedTitle = handleTextSize(title, maxLength);
    titleEntity.element.text = updatedTitle;
  } catch (e) {
    console.log("Error updating product or collection title", e.message);
  }
};

UpdateMaterialAndTheme.prototype.handleLogoUpdate = function (
  entity,
  imageUrl
) {
  // replace s3 url with cdn domain
  const newUrl = imageUrl.replace(
    "zord-storage-bucket.s3.amazonaws.com",
    "d2btao7ncfyde3.cloudfront.net"
  );

  try {
    var asset = new pc.Asset("texture", "texture", {
      url: newUrl,
      magFilter: pc.FILTER_LINEAR,
      minFilter: pc.FILTER_LINEAR,
      graphicsDevice: this.app.graphicsDevice,
    });
    var image = new Image();
    image.crossOrigin = "anonymous";
    asset.resource = image;
    this.app.assets.add(asset);
    asset.on(
      "load",
      function (asset) {
        entity.c.element.texture = asset.resource;
        entity.c.element.texture.upload();
      },
      this
    );
    console.log("asset", asset);
    this.app.assets.load(asset);
  } catch (err) {
    console.log("imageUpdate error", err.message);
  }
};

// UpdateMaterialAndTheme.prototype.handleTextUpdate = function (mainEntity, productData) {
//     const productTitleEntity = mainEntity.children[1];
//     const priceEntity = mainEntity.children[2];
//     const { title, price } = productData;

//     try {
//         productTitleEntity.element.text = title
//         priceEntity.element.text = `$ ${price}`;
//     } catch (e) {
//         console.log('Error updating product text', e.message);
//     }
// }

UpdateMaterialAndTheme.prototype.handleThemeChange = function (themeId) {
  console.log("theme entity list", this.themeEntityList);
  let tag;
  tag = `theme_${themeId}`;
  for (let x = 0; x < this.themeEntityList.length; x++) {
    const entity = this.themeEntityList[x].entity;
    const materialsToSwitch = this.themeEntityList[x].materialsToSwitch;

    var allMeshInstances = [];
    var renders = entity.findComponents("render");
    var meshInstances = renders[0].meshInstances;

    // convert the below loops code in a single loop

    for (var j = 0; j < meshInstances.length; j++) {
      if (materialsToSwitch.includes(j))
        allMeshInstances.push({
          name: meshInstances[j]._material.name,
          instance: meshInstances[j],
        });
    }

    for (i = 0; i < allMeshInstances.length; ++i) {
      var mesh = allMeshInstances[i].instance;
      const name = allMeshInstances[i].name;
      const material = this.getMaterialByNameAndTag(name, tag);
      if (material) {
        // console.log("mesh.material", mesh.material);
        // console.log("material", material);
        mesh.material = material;
      }
    }
  }
  this.app.fire("initialThemeUpdated");
  // setTimeout(() => {
  //     console.log('Starting');
  //     this.app.fire('startNow');
  // }, 2000);
};

UpdateMaterialAndTheme.prototype.getMaterialByNameAndTag = function (
  name,
  tag
) {
  try {
    var assets = this.app.assets.findAll(name, "material");
    const selectedItem = assets.filter((item) => item.tags._list.includes(tag));
    console.log("SelectedItem:", selectedItem);
    return selectedItem[0]._resources[0];
  } catch (err) {
    console.log("Error here", err.message, name);
    return null;
  }
};

function getRandomSubset(array, count, ordered) {
  if (ordered) return array;
  const shuffled = array.slice();
  let i = array.length;
  const min = i - count;
  let temp;
  let index;
  while (i-- > min) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  console.log("shuffled", shuffled.slice(min));
  return shuffled.slice(min);
}

function getRandomUniqueIndexes(array, count) {
  const indexes = [];
  for (let i = 0; i < count; i++) {
    const randomIndex = Math.floor(Math.random() * array.length);
    indexes.push(randomIndex);
  }
  return indexes;
}

function addNewlinesToTagline(tagline, maxCharacters) {
  if (typeof tagline !== "string" || tagline.length <= maxCharacters) {
    return tagline;
  }

  const words = tagline.split(" ");
  let currentLine = "";
  let result = "";

  for (const word of words) {
    if (word.length > maxCharacters) {
      // Break the word into smaller parts if it's longer than the limit
      const wordParts = [];
      let startIndex = 0;

      while (startIndex < word.length) {
        wordParts.push(word.substr(startIndex, maxCharacters));
        startIndex += maxCharacters;
      }

      for (const part of wordParts) {
        if (currentLine !== "") {
          currentLine += " "; // Add space if not at the beginning of the line
        }
        currentLine += part;

        if (currentLine.length >= maxCharacters) {
          // Start a new line if the current line exceeds the limit
          result += currentLine + "\n";
          currentLine = "";
        }
      }
    } else if ((currentLine + word).length + 1 <= maxCharacters) {
      // Check if adding the word and a space exceeds the limit
      if (currentLine !== "") {
        currentLine += " "; // Add space if not at the beginning of the line
      }
      currentLine += word;
    } else {
      // Start a new line and add the word
      result += currentLine + "\n";
      currentLine = word;
    }
  }

  // Add the last line
  if (currentLine !== "") {
    result += currentLine;
  }

  return result;
}

function handleTextSize(title, maxLength) {
  let words = title.split(" ");
  console.log("words:", words);
  let truncatedWords = [];
  let charCount = 0;

  for (let word of words) {
    if (charCount + word.length <= maxLength) {
      truncatedWords.push(word);
      charCount += word.length + 1;
    } else {
      break;
    }
  }

  return truncatedWords.join(" ");
}
// function reduceResolutionWithAspectRatio(width, height, maxResolution) {
//   console.log("maxRes", maxResolution);
//   // const maxResolution = 1000;
//   const currentResolution = width * height;
//   if (currentResolution <= maxResolution) {
//     return { width, height }; // Return original resolution
//   } else {
//     let reductionFactor = Math.sqrt(currentResolution / maxResolution);
//     let reducedWidth = Math.round(width / reductionFactor);
//     let reducedHeight = Math.round(height / reductionFactor);
//     // Adjust the reduced width or height to maintain aspect ratio and fit within maxResolution
//     if (reducedWidth > reducedHeight) {
//       reducedWidth = maxResolution;
//       reducedHeight = Math.round(height * (maxResolution / width));
//     } else {
//       reducedHeight = maxResolution;
//       reducedWidth = Math.round(width * (maxResolution / height));
//     }
//     return { width: reducedWidth, height: reducedHeight };
//   }
// }

const hasPreviewParam = (url) => {
  const queryString = url.split("?")[1];
  const queryParams = new URLSearchParams(queryString);
  return queryParams.has("preview_key");
};

function getStoreNumber(url) {
  const storeUrl = url.href;
  console.log("Store url", storeUrl);
  let storeNumber = 1;

  const match = storeUrl.match(/\/(\d+)\/?/);

  if (match) {
    storeNumber = match[1];
    console.log("storeNumber", storeNumber);
  } else {
    console.log("Store number not found in the URL path.");
  }

  return storeNumber;
}

function modifyImageUrl(url, size) {
  // Split the URL into two parts: before the query parameters and the query parameters themselves
  const [baseUrl, queryParams] = url.split("?");
  // Find the last dot to insert the size modifier before the file extension
  const lastDotIndex = baseUrl.lastIndexOf(".");

  // Insert the size before the file extension
  const newUrl =
    baseUrl.slice(0, lastDotIndex) +
    `_${size}x${size}` +
    baseUrl.slice(lastDotIndex);

  // Reconstruct the URL with query parameters
  return queryParams ? newUrl + "?" + queryParams : newUrl;
}

function customToast(msg, bool, timer) {
  const toast = document.getElementById("toast");
  if (bool === false) {
    toast.classList.add("bg-red-500");
    toast.classList.remove("bg-[#2b2b2a]");
  } else {
    toast.classList.remove("bg-red-500");
    toast.classList.add("bg-[#2b2b2a]");
  }
  toast.textContent = msg || "";
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), timer ? timer : 3000);
}

function customToast1(msg, bool) {
  const toast = document.getElementById("toast1");
  toast.classList.remove("bg-red-500");
  toast.classList.add("bg-[#2b2b2a]");
  toast.textContent = msg || "";
  toast.classList.remove("hidden");
  if (bool) toast.classList.add("hidden");
}
