import joblib
import os
import numpy as np

base_dir = os.path.dirname(os.path.abspath(__file__))
assets_dir = os.path.join(base_dir, "assets")

scaler_path = os.path.join(assets_dir, "yummy_scaler6.pkl")
pca_path = os.path.join(assets_dir, "yummy_pca4.pkl")
model_path = os.path.join(assets_dir, "yummy_xgb_model6.pkl")

print(f"Loading files from: {assets_dir}")

try:
    scaler = joblib.load(scaler_path)
    print(f"Scaler type: {type(scaler)}")
    if hasattr(scaler, 'n_features_in_'):
        print(f"Scaler expected features: {scaler.n_features_in_}")
    if hasattr(scaler, 'feature_names_in_'):
        print(f"Scaler feature names: {scaler.feature_names_in_}")
except Exception as e:
    print(f"Error loading scaler: {e}")

try:
    pca = joblib.load(pca_path)
    print(f"PCA type: {type(pca)}")
    if hasattr(pca, 'n_features_in_'):
        print(f"PCA expected features: {pca.n_features_in_}")
    print(f"PCA components: {pca.n_components_}")
except Exception as e:
    print(f"Error loading PCA: {e}")

try:
    model = joblib.load(model_path)
    print(f"Model type: {type(model)}")
    if hasattr(model, 'n_features_in_'):
        print(f"Model expected features: {model.n_features_in_}")
    # For XGBoost
    if hasattr(model, 'feature_names_in_'):
        print(f"Model feature names: {model.feature_names_in_}")
    elif hasattr(model, 'get_booster'):
        booster = model.get_booster()
        print(f"Booster feature names: {booster.feature_names}")
except Exception as e:
    print(f"Error loading model: {e}")
