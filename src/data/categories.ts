export interface Category {
  id: number;
  name: string;
}

// const API_URL = "http://localhost:3000";

export async function getCategories() {
  const token = localStorage.getItem("token");

  const response = await fetch("http://localhost:3000/categories", {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Error al obtener categorías");
  }

  return response.json();
}