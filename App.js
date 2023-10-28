import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View, SafeAreaView, Platform, Linking } from "react-native";
import MapView, { Marker, Callout, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { Magnetometer } from "expo-sensors";
import axios from "axios";

export default function App() {
  const [latitude, setLatitude] = useState(null);
  const [longitude, setLongitude] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [magnetometerData, setMagnetometerData] = useState({});
  const [data, setData] = useState([]);
  const [pathCoordinates, setPathCoordinates] = useState([]);
  const [totalDistance, setTotalDistance] = useState(0);
  
  

  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  const fetchData = async () => {
    try {
      const response = await axios.get("https://pg-api-45dn.onrender.com/coldata");
      const addArr = [];
      for (const e of response.data) {
        try {
          const locationData = await Location.geocodeAsync(e.pickupaddress1);
          if (locationData && locationData.length > 0) {
            addArr.push({
              address: e.pickupaddress1,
              name: e.customername,
              loanNo: e.loancardaccountno,
              latitude: locationData[0].latitude,
              longitude: locationData[0].longitude,
            });
          }
        } catch (err) {
          console.log("Error in geocoding: ", err);
        }
      }
      console.log("Fetched data: ", addArr);
      setData(addArr);
    } catch (error) {
      console.error("Error fetching data: ", error);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          throw new Error("Permission to access location was denied");
        }
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Highest,
        });
        let { latitude, longitude } = location.coords;
        setLatitude(latitude);
        setLongitude(longitude);
        setIsLoading(false);
        fetchData();
      } catch (error) {
        console.error("Error getting location: ", error);
        setErrorMsg("Error getting location");
        setIsLoading(false);
        fetchData();
      }
    })();

    _toggle = () => {
      if (this._subscription) {
        this._unsubscribe();
      } else {
        this._subscribe();
      }
    };

    _subscribe = () => {
      this._subscription = Magnetometer.addListener((result) => {
        setMagnetometerData(result);
      });
    };

    _unsubscribe = () => {
      this._subscription && this._subscription.remove();
      this._subscription = null;
    };

    return () => this._unsubscribe();
  }, []);

  const handleGetDirections = (latitude, longitude) => {
    const scheme = Platform.select({ ios: "maps:0,0?q=", android: "geo:0,0?q=" });
    const latLng = `${latitude},${longitude}`;
    const label = "Custom Label";
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.openURL(url);

    const newCoordinate = { latitude, longitude };
    setPathCoordinates(prevCoordinates => [...prevCoordinates, newCoordinate]);
    
    if (latitude && longitude && pathCoordinates.length > 0) {
      const lastCoordinate = pathCoordinates[pathCoordinates.length - 1];
      const distanceFromLastPoint = calculateDistance(lastCoordinate.latitude, lastCoordinate.longitude, latitude, longitude);
      const totalDistanceFromStart = pathCoordinates.reduce((total, coord, index) => {
        if (index === 0) {
          return total + calculateDistance(latitude, longitude, coord.latitude, coord.longitude);
        } else {
          const prevCoord = pathCoordinates[index - 1];
          return total + calculateDistance(prevCoord.latitude, prevCoord.longitude, coord.latitude, coord.longitude);
        }
      }, 0);

      setTotalDistance(totalDistanceFromStart + distanceFromLastPoint);
    }
  };
  

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {latitude && longitude && (
        <MapView
          style={styles.map}
          showsUserLocation={true}
          followsUserLocation={true}
          loadingEnabled={true}
          loadingIndicatorColor="#666666"
          loadingBackgroundColor="#eeeeee"
          moveOnMarkerPress={false}
          showsCompass={true}
          rotateEnabled={true}
          camera={{
            center: { latitude, longitude },
            heading: magnetometerData && magnetometerData.magHeading ? magnetometerData.magHeading : 0,
            pitch: 45,
            altitude: 1000,
            zoom: 15,
          }}
        >
          <Marker coordinate={{ latitude: latitude, longitude: longitude }} title="My Location">
            <Callout>
              <View>
                <Text>You are here</Text>
              </View>
            </Callout>
          </Marker>
          {data.map((e, index) => (
            <Marker
              key={index}
              coordinate={{ latitude: e.latitude, longitude: e.longitude }}
              pinColor={"blue"}
              onPress={() => handleGetDirections(e.latitude, e.longitude)}
            >
              <Callout style={styles.calloutContainer}>
                <View style={styles.callout}>
                  <Text style={styles.calloutText}>{e.name}</Text>
                  <Text style={styles.calloutText}>{e.loanNo}</Text>
                  {latitude && longitude && (
                    <Text style={styles.calloutText}>
                      Distance: {calculateDistance(latitude, longitude, e.latitude, e.longitude).toFixed(2)} km
                    </Text>
                  )}
                  <Text style={styles.calloutText} onPress={() => handleGetDirections(e.latitude, e.longitude)}>
                    Get Directions
                  </Text>
                </View>
              </Callout>
            </Marker>
          ))}
          {pathCoordinates.length > 0 && (
            <Polyline
              coordinates={[
                { latitude: latitude, longitude: longitude },
                ...pathCoordinates,
              ]}
              strokeWidth={4}
              strokeColor="red"
            />
          )}
        </MapView>
      )}
      <View style={styles.distanceContainer}>
      <Text style={styles.distanceText}>Total Distance: {pathCoordinates.length > 0 ? (calculateDistance(latitude, longitude, pathCoordinates[0].latitude, pathCoordinates[0].longitude) + totalDistance).toFixed(2) : totalDistance.toFixed(2)} km</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: Platform.OS === "android" ? 25 : 0,
  },
  map: {
    width: "100%",
    height: "90%",
  },
  calloutContainer: {
    position: "absolute",
    bottom: 10,
    alignItems: "center",
  },
  callout: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 5,
  },
  calloutText: {
    color: "black",
    fontWeight: "bold",
  },
  distanceContainer: {
    position: "absolute",
    top: 10,
    left: 10,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 5,
  },
  distanceText: {
    color: "black",
    fontWeight: "bold",
  },
});
