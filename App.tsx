import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useEffect } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Switch,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { AntDesign } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  useEffect(() => {
    // Laden der gespeicherten Allergene beim Start der App
    const loadAllergene = async () => {
      try {
        const jsonValue = await AsyncStorage.getItem("allergene");
        if (jsonValue !== null) {
          setAllergene(JSON.parse(jsonValue));
        }
      } catch (e) {
        console.error("Fehler beim Laden der Allergene:", e);
      }
    };

    loadAllergene();
  }, []); // Leerer Abhängigkeitsarray stellt sicher, dass dies nur einmal beim Start der App geladen wird

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    requestPermission();
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

          allergene.forEach((value) => {
            if (data.product.allergens.includes(value)) {
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

  const storeAllergene = async (allergeneToStore: string[]) => {
    try {
      const jsonValue = JSON.stringify(allergeneToStore);
      await AsyncStorage.setItem("allergene", jsonValue);
    } catch (e) {
      console.error("Fehler beim Speichern der Allergene:", e);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.menuButton}
        onPress={() => {
          toggleOptionVis(!optionVis);
        }}
      >
        <Entypo name="menu" size={44} color="#3f545f" />
      </TouchableOpacity>

      {optionVis && (
        <View style={styles.optionsPage}>
          <TouchableOpacity
            style={styles.optionsPageCloseButt}
            onPress={() => {
              toggleOptionVis(!optionVis);
              storeAllergene(allergene); // Speichern der Allergene, wenn die Optionen-Seite geschlossen wird
            }}
          >
            <AntDesign name="closecircleo" size={24} color="white" />
          </TouchableOpacity>
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
        onPress={() => {
          console.log(permission);
          if (permission.status === "denied") {
            return;
          }
          toggleScanActive(!scanActive);
          setProbleminhalt([]);
          setProductInfo(null);
          toggleWarnung(false);
        }}
      />

      {/* Camera */}
      {scanActive && (
        <CameraView
          style={styles.camera}
          autofocus="on"
          barcodeScannerSettings={{
            barcodeTypes: [
              "aztec",
              "ean13",
              "ean8",
              "qr",
              "pdf417",
              "upc_e",
              "datamatrix",
              "code39",
              "code93",
              "itf14",
              "codabar",
              "code128",
              "upc_a",
            ],
          }}
          onBarcodeScanned={(e) => handelBarCodeScan(e)}
        ></CameraView>
      )}

      <Text style={styles.brandName}>ScanSafe</Text>

      {productInfo && (
        <View
          style={[
            styles.responseContainer,
            { backgroundColor: warnung ? "red" : "green" },
          ]}
        >
          <Text style={styles.productBrand}>{productInfo.brands},</Text>
          <Text style={styles.productName}>{productInfo.product_name}</Text>
          {warnung ? (
            <Text style={styles.ergebnisText}>
              Achtung dieses Produkt enthält: {problemInhalt}
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
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
    backgroundColor: "#0c0e0f",
  },
  brandName: {
    color: "#3f545f",
    fontSize: 80,
    position: "relative",
    bottom: -250,
    fontFamily: "Roboto",
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
  responseContainer: {
    position: "absolute",
    bottom: 100,
    padding: 10,
    borderRadius: 10,
    height: 200,
    width: "95%",
  },
  productBrand: {
    fontSize: 22,
    fontWeight: "800",
  },
  productName: {
    color: "black",
    fontSize: 20,
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
