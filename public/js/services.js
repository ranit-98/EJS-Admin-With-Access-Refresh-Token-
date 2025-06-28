//--------------------------------------------------------------------------------
//                  Initialize services from the window object
//--------------------------------------------------------------------------------

let services = [];
try {
  services = JSON.parse(window.servicesString || "[]");
} catch (e) {
  console.error("Error parsing services:", e);
  services = [];
}

//--------------------------------------------------------------------------------
//                  Function to render the services grid
//--------------------------------------------------------------------------------

const renderGrid = () => {
  const table = document.getElementById("servicesTable");
  table.innerHTML = "";

  new gridjs.Grid({
    columns: ["#", "Icon", "Title", "Description", "Actions"],
    data: services.map((s, i) => [
      i + 1,
      gridjs.html(
        `<img src="/uploads/${s.icon}" class="img-fluid" style="width: 50px; height: 50px;" alt="Service Icon">`
      ),
      s.title,
      s.description,
      gridjs.html(`
        <button class="btn btn-sm btn-warning me-1" onclick="editService('${s._id}')"><i class="bi bi-pencil-square"></i></button>
        <button class="btn btn-sm btn-danger" onclick="confirmDeleteService('${s._id}')">
          <i class="bi bi-trash"></i>
         </button>
      `),
    ]),
    pagination: { limit: 5 },
    search: true,
    sort: true,
    className: {
      table: "table table-bordered table-hover",
    },
  }).render(table);
};

//--------------------------------------------------------------------------------
//                   Function to edit a service
//--------------------------------------------------------------------------------

window.editService = async (serviceId) => {
  try {
    
    const res = await fetch(
      `/services/${serviceId}/edit?_=${new Date().getTime()}`,
      {
        headers: {
          "Cache-Control": "no-store",
          Pragma: "no-cache",
          Expires: "0", 
        },
      }
    );

    if (!res.ok) {
      throw new Error(
        `Failed to fetch service data: ${res.status} ${res.statusText}`
      );
    }

    let service;
    try {
      service = await res.json();
    } catch (e) {
      console.error("Error parsing JSON response:", e);
      throw new Error("Invalid response format from server");
    }

    console.log("Service data received:", service);

    if (!service || typeof service !== "object") {
      throw new Error("Invalid service data received");
    }

    // Populate the form fields
    document.getElementById("editId").value = serviceId;
    document.getElementById("serviceTitle").value = service.title || "";
    document.getElementById("serviceDescription").value =
      service.description || "";

    // Update modal title
    document.getElementById("modalTitle").textContent = "Edit Service";

    // Show current image if available
    if (service.icon) {
      document.getElementById("currentImage").src = `/uploads/${service.icon}`;
      document.getElementById("currentImageContainer").style.display = "block";
    } else {
      document.getElementById("currentImageContainer").style.display = "none";
    }

    // Reset file input and hide preview
    document.getElementById("serviceIcon").value = "";
    document.getElementById("imagePreviewContainer").style.display = "none";

    // Show the modal
    const modal = new bootstrap.Modal(
      document.getElementById("addServiceModal")
    );
    modal.show();
  } catch (err) {
    console.error("Error fetching service:", err);
    alert("Failed to load service data for editing: " + err.message);
  }
};

//--------------------------------------------------------------------------------
//                   Function to open the add service modal
//--------------------------------------------------------------------------------

window.openAddModal = () => {
  
  document.getElementById("serviceForm").reset();
  document.getElementById("editId").value = "";
  document.getElementById("modalTitle").textContent = "Add New Service";

  
  document.getElementById("imagePreviewContainer").style.display = "none";
  document.getElementById("currentImageContainer").style.display = "none";
};

//--------------------------------------------------------------------------------
//                      Function to preview uploaded image
//--------------------------------------------------------------------------------

window.previewImage = (event) => {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function () {
      document.getElementById("imagePreview").src = reader.result;
      document.getElementById("imagePreviewContainer").style.display = "block";
      document.getElementById("currentImageContainer").style.display = "none";
    };
    reader.readAsDataURL(file);
  } else {
    document.getElementById("imagePreviewContainer").style.display = "none";
    if (document.getElementById("editId").value) {
      document.getElementById("currentImageContainer").style.display = "block";
    }
  }
};

//--------------------------------------------------------------------------------
//                        Function to confirm service deletion
//--------------------------------------------------------------------------------

window.confirmDeleteService = (serviceId) => {
  console.log("Preparing to delete:", serviceId);

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  confirmBtn.setAttribute("data-service-id", serviceId);

  const confirmModal = new bootstrap.Modal(
    document.getElementById("deleteServiceModal")
  );
  confirmModal.show();
};

//--------------------------------------------------------------------------------
//                     Function to delete a service
//--------------------------------------------------------------------------------

window.deleteService = async (serviceId) => {
  try {
    const res = await fetch(`/services/${serviceId}/delete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });

    if (res.ok) {
     
      location.reload();
    } else {
      const error = await res.text();
      console.error("Failed to delete service:", error);
      alert("Failed to delete service");
    }
  } catch (err) {
    console.error("Error deleting service:", err);
    alert("Something went wrong while deleting");
  } finally {
   
    const modalEl = document.getElementById("deleteServiceModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
  }
};

//--------------------------------------------------------------------------------
//                      Initialize when DOM is loaded
//--------------------------------------------------------------------------------

document.addEventListener("DOMContentLoaded", function () {
  // Set up form submission
  const serviceForm = document.getElementById("serviceForm");
  serviceForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!this.checkValidity()) {
      this.classList.add("was-validated");
      return;
    }

    const formData = new FormData(this);
    const serviceId = document.getElementById("editId").value;

    let url = "/services";
    if (serviceId) {
      url = `/services/${serviceId}/update`;
    }

    try {
      const res = await fetch(url, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        location.reload();
      } else {
        const error = await res.json();
        console.error("Form submission failed:", error);
        alert("Failed to save service");
      }
    } catch (err) {
      console.error("Error submitting form:", err);
      alert("Something went wrong while saving");
    }
  });

//--------------------------------------------------------------------------------
//          Set up delete confirmation button - Moved outside the submit listener
//--------------------------------------------------------------------------------

  const confirmBtn = document.getElementById("confirmDeleteBtn");
  confirmBtn.addEventListener("click", function () {
    const serviceId = this.getAttribute("data-service-id");
    console.log("Clicked delete for:", serviceId);
   
      deleteService(serviceId);
  
  });

  // Render the grid
  renderGrid();
});
