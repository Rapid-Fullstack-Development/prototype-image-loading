import React from "react";
import EXIF from 'exif-js';
import { Loader } from "@googlemaps/js-api-loader";

//
// https://developers.google.com/maps/documentation/javascript
// 
// Setup up project: https://developers.google.com/maps/documentation/javascript/cloud-setup
// Using API keys: https://developers.google.com/maps/documentation/javascript/get-api-key
// Reverse geocoding: https://developers.google.com/maps/documentation/javascript/examples/geocoding-reverse
// Had to wait 10 mins for the API key to come online: https://stackoverflow.com/a/27463276/25868
// I had to enable Maps, Places and Geocoding APIs to get the key to work.
//

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (GOOGLE_API_KEY) {
    console.log("Loading Google API");

    const loader = new Loader({
        apiKey: GOOGLE_API_KEY,
        version: "weekly",
    });
      
    loader.load().then(() => {
        console.log(`Google maps is loaded`);
    });
}

//
// Reverse geocode the requested location (needs lat and lng fields).
//
// You must set an approriately configured Google API key in the environment variable GOOGLE_API_KEY for this to work.
//
function reverseGeocode(location) {
    return new Promise((resolve, reject) => {
        if (typeof(google) === "undefined") {
            // Google API key was not provided and the Google API was not loaded.
            resolve(undefined);
            return;
        }

        const geocoder = new google.maps.Geocoder();
        geocoder
            .geocode({ location: location })
            .then(response => {
                if (response.results && response.results.length > 0) {
                    resolve(response.results[0].formatted_address);
                }
                else {
                    resolve(undefined);
                }
            })
            .catch(reject);
    });
}

//
// Loads a file to a data URL.
//
function loadFile(file) { 
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.addEventListener('error', () => {
            reject(new Error(`Error reading file ${file.name}.`));
        });

        reader.addEventListener('load', evt => {
            resolve(evt.target.result)
        });
        
        reader.readAsDataURL(file);
    });
}

//
// Loads URL or source data to an image element.
//
function loadImage(imageSrc) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            resolve(img);
        };
        img.onerror = error => {
            reject(error);
        };
        img.src = imageSrc;
    });
}

//
// Gets the size of an image element.
//
async function getImageResolution(imageSrc) {
    const image = await loadImage(imageSrc);
    return {
        width: image.width,
        height: image.height,
    };
}

//
// Resizes an image.
//
// https://stackoverflow.com/a/43354901/25868
//
function resizeImage(imageData, maxSize) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload = () => {
            const oc = document.createElement('canvas'); // As long as we don't reference this it will be garbage collected.
            const octx = oc.getContext('2d')!;
            oc.width = img.width;
            oc.height = img.height;
            octx.drawImage(img, 0, 0);

            // Commented out code could be useful.
            // if( img.width > img.height) {
            //     oc.height = (img.height / img.width) * max;
            //     oc.width = max;
            // } 
            // else {
                oc.width = (img.width / img.height) * maxSize;
                oc.height = maxSize;
            // }

            octx.drawImage(oc, 0, 0, oc.width, oc.height);
            octx.drawImage(img, 0, 0, oc.width, oc.height);
            resolve(oc.toDataURL());
        };
        img.src = imageData;
    });
}

//
// Retreives exif data from the file.
//
// https://github.com/exif-js/exif-js
//
function getExifData(file) {
    return new Promise((resolve, reject) => {
        EXIF.getData(file, function () { // ! Don't change this to an arrow function. It might break the way this works.
            resolve(EXIF.getAllTags(this));
        });
    });
}

export class App extends React.Component {

    constructor(props) {
        super(props);

        this.state = {};
    }

    onFilesChanged = async files => {

        try {
            const fileInfo = [];
    
            for (const file of files) {
                try {
                    const imageData = await loadFile(file);
                    const fileDetails = {
                        name: file.name,
                        contentType: file.type,
                        size: file.size,
                        imageData: imageData,
                    };
                    if (fileDetails.contentType.startsWith("image/")) {
                        const imageResolution = await getImageResolution(imageData);
                        const thumbnailData = await resizeImage(imageData, 25);
                        fileDetails.resolution = imageResolution;
                        fileDetails.thumbnailData = thumbnailData;
                        fileDetails.exif = await getExifData(file);
                        if (fileDetails.exif.GPSLatitude && fileDetails.exif.GPSLongitude) {
                            // https://gis.stackexchange.com/a/273402
                            function convertToDegrees([degrees, minutes, seconds]) {
                                var deg = degrees.numerator/degrees.denominator;
                                var min = minutes.numerator/minutes.denominator;
                                var sec = seconds.numerator/seconds.denominator;
                                return deg + (min/60) + (sec/3600);
                            }
                            const coordinates = {
                                lat: convertToDegrees(fileDetails.exif.GPSLatitude),
                                lng: convertToDegrees(fileDetails.exif.GPSLongitude),
                            };
                            
                            if (fileDetails.exif.GPSLatitudeRef === "S") {
                                // If the latitude reference is "S", the latitude is negative
                                coordinates.lat = coordinates.lat * -1;
                            }

                            if (fileDetails.exif.GPSLongitudeRef === "W") {
                                // If the longitude reference is "W", the longitude is negative (thanks ChatGPT!)
                                coordinates.lng = coordinates.lng * -1;
                            }

                            fileDetails.location = await reverseGeocode(coordinates);
                        }
                    }
                    fileInfo.push(fileDetails);
                }
                catch (error) {
                    console.error(`Failed for ${file.name}`); 
                    console.error(error);
                }
            }
            
            this.setState({
                files: fileInfo,
            });
        }
        catch (error) {
            console.error(`Failed!`); 
            console.error(error);
        }
    };

    render() {
        return (
            <div>
                <p>Select some image files</p>
                <input
                    type="file"
                    multiple={true}
                    onChange={evt => this.onFilesChanged(evt.target.files)}
                    />

                {this.state.files !== undefined
                    && <div>
                        <h2>File to upload</h2>
                        <table>
                            <tbody>
                                <tr>
                                    <th>Name</th>
                                    <th>Type</th>
                                    <th>Size</th>
                                    <th>Resolution</th>
                                    <th>Base64</th>
                                </tr>
                                {this.state.files.map(file => {
                                    return (
                                        <tr key={file.name}>
                                            <td>
                                                {file.name} 
                                            </td>
                                            <td>
                                                {file.contentType} 
                                            </td>
                                            <td>
                                                {file.size} 
                                            </td>
                                            <td>
                                                {file.contentType.startsWith("image/")
                                                    && <>
                                                        {file.resolution.width}x{file.resolution.height}
                                                    </>
                                                }
                                            </td>
                                            <td>
                                                {file.imageData.slice(0, 50)}...
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>

                        <h2>Thumbnails</h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                            }}
                            >
                            {this.state.files.filter(file => file.contentType.startsWith("image/")).map(file => {
                                return (
                                    <div id={file.name + "-thumb"}>
                                        <img 
                                            src={file.thumbnailData}
                                            style={{
                                                height: "100px",
                                            }}
                                            />
                                    </div>
                                )
                            })}
                        </div>

                        <h2>Images</h2>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "row",
                                flexWrap: "wrap",
                            }}
                            >
                            {this.state.files.filter(file => file.contentType.startsWith("image/")).map(file => {
                                return (
                                    <div id={file.name + "-full"}>
                                        <img 
                                            src={file.imageData} 
                                            style={{
                                                height: "100px",
                                            }}
                                            />
                                    </div>
                                )
                            })}
                        </div>

                        <h2>Exif</h2>
                        <div>
                            {this.state.files.filter(file => file.exif).map(file => {
                                return (
                                    <div id={file.name + "-exif"}>
                                        <pre>
                                            {JSON.stringify(file.exif, null, 4)}
                                        </pre>
                                    </div>
                                )
                            })}
                        </div>

                        <h2>Location</h2>
                        <div>
                            {this.state.files.filter(file => file.location).map(file => {
                                return (
                                    <div id={file.name + "-location"}>
                                        <pre>
                                            {file.location}
                                        </pre>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                }

            </div>
        )
    }
}