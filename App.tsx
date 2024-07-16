import { CameraView, FlashMode, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import {
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
  Switch,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";

interface BarcodeScanningResult {
  type: string;
  data: string;
}

interface ProductInfo {
  code: string;
  product_name: string;
  brands: string;
  allergens: string;
  ingredients_text: string;
  image_url: string;
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanActive, toggleScanActive] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [warnung, toggleWarnung] = useState(false);
  const [problemInhalt, setProbleminhalt] = useState<string[]>([]);
  const [optionVis, toggleOptionVis] = useState(false);
  const [allergene, setAllergene] = useState<string[]>([]);

  const lebensmittelallergeneTranslate = [
    "Milch",
    "Eier",
    "Nüsse",
    "Soja",
    "Fisch",
    "Krebstiere",
    "Weizen",
    "Schalentiere",
  ];
  const lebensmittelallergene = [
    "en:milk",
    "en:eggs",
    "en:nuts",
    "en:soybeans",
    "en:fish",
    "en:crustaceans",
    "en:wheat",
    "en:shellfish",
  ];

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: "center" }}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  function handelBarCodeScan(e: BarcodeScanningResult) {
    const code = e.data;
    toggleScanActive(false);
    getInfos(code);
  }

  function getInfos(code: string) {
    console.log("Current Code:", code);
    fetch(`https://world.openfoodfacts.org/api/v3/product/${code}.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if (data.product) {
          const product: ProductInfo = {
            code: data.product.code,
            product_name: data.product.product_name || "Unknown Product",
            brands: data.product.brands || "Unknown Brand",
            allergens: data.product.allergens || "None",
            ingredients_text:
              data.product.ingredients_text || "No ingredients data",
            image_url: data.product.image_url || "",
          };
          setProductInfo(product);

          toggleWarnung(false);
          setProbleminhalt([]);
          allergene.forEach((value) => {
            if (data.product.allergens.includes(value)) {
              // console.log("Es enthält", value, " an der Stelle ", index);
              toggleWarnung(true);
              setProbleminhalt([
                ...problemInhalt,
                lebensmittelallergeneTranslate[
                  lebensmittelallergene.indexOf(value)
                ],
              ]);
            }
          });
        } else {
          setProductInfo(null);
        }
      })
      .catch((error) => {
        console.error("Error:", error);
        toggleScanActive(true);
      });
  }

  const handleAllergieChange = (index: number) => {
    const allergie = lebensmittelallergene[index];
    if (allergene.includes(allergie)) {
      setAllergene(allergene.filter((item) => item !== allergie));
    } else {
      setAllergene([...allergene, allergie]);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => {
          toggleOptionVis(!optionVis);

          console.log(allergene);
        }}
      >
        <Entypo name="menu" size={44} color="#3f545f" />
      </TouchableOpacity>

      {optionVis && (
        <View style={styles.optionsPage}>
          <TouchableOpacity
            style={styles.optionsPageCloseButt}
            onPress={() => toggleOptionVis(!optionVis)}
          >
            <AntDesign name="closecircleo" size={24} color="white" />
          </TouchableOpacity>
          {/* <Text style={styles.optionsTitle}>Unverträglichkeiten</Text> */}
          <Text style={styles.optionsTitle}>Allergene</Text>

          {lebensmittelallergeneTranslate.map((allergie, index) => {
            return (
              <View style={styles.allergieItem} key={index}>
                <Text style={styles.allergie}>{allergie}</Text>
                <Switch
                  value={allergene.includes(lebensmittelallergene[index])}
                  onValueChange={() => handleAllergieChange(index)}
                />
              </View>
            );
          })}
        </View>
      )}

      {/* Toggle Camera */}
      <AntDesign
        name="camera"
        size={84}
        color="white"
        style={styles.toggleCam}
        onPress={() => toggleScanActive(!scanActive)}
      />

      {/* Camera */}
      {scanActive && (
        <CameraView
          style={styles.camera}
          autofocus="on"
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "upc_a"],
          }}
          onBarcodeScanned={(e) => handelBarCodeScan(e)}
        ></CameraView>
      )}

      {productInfo && (
        <View
          style={[
            styles.responseContainer,
            { backgroundColor: warnung ? "red" : "green" },
          ]}
        >
          <Text style={styles.productBrand}>{productInfo.brands},</Text>
          <Text style={styles.productName}>{productInfo.product_name}</Text>
          {/* <Text>{productInfo.allergens}</Text> */}
          {warnung ? (
            <Text style={styles.ergebnisText}>
              Achtung dieses Produkt enthält: {problemInhalt.join(", ")}
            </Text>
          ) : (
            <Text style={styles.ergebnisText}>Keine Allergien vorhanden</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    height: "100%",
    backgroundColor: "#0c0e0f",
  },
  camera: {
    height: "50%",
    width: "100%",
    position: "absolute",
    top: 0,
    zIndex: 2,
  },
  toggleCam: {
    borderRadius: 10,
    marginTop: 100,
  },
  toggleCamText: {
    color: "#eeeff0",
    fontSize: 40,
    textAlign: "center",
  },
  responseContainer: {
    position: "absolute",
    bottom: 100,
    padding: 10,
    borderRadius: 10,
    height: 200,
    width: "95%",
  },
  responseText: {
    color: "white",
    fontSize: 36,
  },
  productBrand: {
    fontSize: 22,
    fontWeight: "800",
  },
  productName: {
    color: "black",
    fontSize: 20,
  },
  item: {
    padding: 10,
    fontSize: 18,
    height: 44,
  },
  menuButton: {
    position: "absolute",
    bottom: 10,
    left: 10,
  },
  optionsPage: {
    paddingTop: 100,
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 2,
    width: "100%",
    height: "100%",
    backgroundColor: "black",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  optionsPageCloseButt: {
    position: "absolute",
    left: 40,
    top: 40,
  },
  optionsTitle: {
    color: "#7599ac",
    fontSize: 30,
    fontWeight: "900",
    marginBottom: 50,
  },
  allergieItem: {
    width: "70%",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#3f545f",
  },
  allergie: {
    color: "white",
    textAlign: "left",
    fontSize: 20,
  },
  ergebnisText: {
    marginTop: 20,
    fontSize: 20,
  },
});

// --text: #eeeff0;
// --background: #0c0e0f;
// --primary: #b4c1c8;
// --secondary: #3f545f;
// --accent: #7599ac;
