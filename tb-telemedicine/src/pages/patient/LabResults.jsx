// import { useEffect, useState } from "react";
// import { supabase } from "../../client";

// export default function LabResults({ token }) {
//   const [xrayUrl, setXrayUrl] = useState(null);
//   const [sputumUrl, setSputumUrl] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [uploading, setUploading] = useState(false);

//   useEffect(() => {
//     async function getLabResults() {
//       setLoading(true);

//       const { data, error } = await supabase
//         .from("lab_results")
//         .select("xray_path, sputum_path")
//         .eq("user_id", token.user.id)
//         .single();

//       if (error && error.code !== "PGRST116") {
//         console.warn("Error fetching lab results:", error);
//       } else if (data) {
//         if (data.xray_path) downloadFile(data.xray_path, setXrayUrl);
//         if (data.sputum_path) downloadFile(data.sputum_path, setSputumUrl);
//       }

//       setLoading(false);
//     }

//     getLabResults();
//   }, [token]);

//   // Download from storage
//   async function downloadFile(path, setUrl) {
//     try {
//       const { data, error } = await supabase.storage
//         .from("labresults")
//         .download(path);
//       if (error) throw error;

//       const url = URL.createObjectURL(data);
//       setUrl(url);
//     } catch (err) {
//       console.log("Error downloading file:", err.message);
//     }
//   }

//   // Upload + save into DB
// // Upload + save into DB
// async function uploadFile(event, type) {
//   try {
//     setUploading(true);

//     if (!event.target.files || event.target.files.length === 0) {
//       throw new Error("You must select a file to upload.");
//     }

//     const file = event.target.files[0];
//     const fileExt = file.name.split(".").pop();
//     const fileName = `${type}-${Math.random()}.${fileExt}`;
//     const filePath = `${fileName}`;

//     // Upload to Supabase storage
//     const { error: uploadError } = await supabase.storage
//       .from("labresults")
//       .upload(filePath, file, { upsert: true });

//     if (uploadError) throw uploadError;

//     // Always include user_id (since it’s UNIQUE)
//     const updates = {
//       user_id: token.user.id,
//       updated_at: new Date()
//     };

//     if (type === "xray") {
//       updates.xray_path = filePath;
//     } else {
//       updates.sputum_path = filePath;
//     }

//     // Now upsert will UPDATE existing row instead of inserting duplicate
//     const { error: dbError } = await supabase
//       .from("lab_results")
//       .upsert(updates, { onConflict: "user_id" });

//     if (dbError) throw dbError;

//     // Download for preview
//     if (type === "xray") {
//       downloadFile(filePath, setXrayUrl);
//     } else {
//       downloadFile(filePath, setSputumUrl);
//     }
//   } catch (error) {
//     alert(error.message);
//   } finally {
//     setUploading(false);
//   }
// }


//   return (
//     <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
//       <div className="w-full max-w-2xl p-6 bg-white rounded-2xl shadow-md space-y-6">
//         <h2 className="text-2xl font-semibold text-center text-green-600">
//           Upload Lab Results
//         </h2>

//         {loading ? (
//           <p className="text-center text-gray-500">Loading...</p>
//         ) : (
//           <>
//             {/* X-ray Section */}
//             <div className="space-y-3">
//               <h3 className="text-lg font-medium text-green-600">X-ray Result</h3>
//               {xrayUrl ? (
//                 <img
//                   src={xrayUrl}
//                   alt="X-ray Result"
//                   className="w-full max-h-80 object-contain rounded-lg border"
//                 />
//               ) : (
//                 <p className="text-gray-500 italic">No X-ray uploaded yet.</p>
//               )}
//               <label className="block w-full text-center font-bold bg-green-600 text-white py-2 px-4 rounded-md cursor-pointer hover:bg-green-700">
//                 {uploading ? "Uploading..." : "Upload X-ray"}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   className="hidden"
//                   onChange={(e) => uploadFile(e, "xray")}
//                   disabled={uploading}
//                 />
//               </label>
//             </div>

//             {/* Sputum Section */}
//             <div className="space-y-3">
//               <h3 className="text-lg font-medium text-green-600">Sputum Result</h3>
//               {sputumUrl ? (
//                 <img
//                   src={sputumUrl}
//                   alt="Sputum Result"
//                   className="w-full max-h-80 object-contain rounded-lg border"
//                 />
//               ) : (
//                 <p className="text-gray-500 italic">No sputum uploaded yet.</p>
//               )}
//               <label className="block w-full text-center font-bold bg-green-600 text-white py-2 px-4 rounded-md cursor-pointer hover:bg-green-700">
//                 {uploading ? "Uploading..." : "Upload Sputum"}
//                 <input
//                   type="file"
//                   accept="image/*"
//                   className="hidden"
//                   onChange={(e) => uploadFile(e, "sputum")}
//                   disabled={uploading}
//                 />
//               </label>
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }



import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "../../client";

export default function LabResults({ token }) {
  const { id } = useParams();
  const location = useLocation();

  // Role + userId detection
  const isDoctor = location.pathname.includes("/doctor/");
  const role = isDoctor ? "doctor" : "patient";
  const userId = isDoctor && id ? id : token?.user?.id;

  const [xrayUrl, setXrayUrl] = useState(null);
  const [sputumUrl, setSputumUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function getLabResults() {
      setLoading(true);

      const { data, error } = await supabase
        .from("lab_results")
        .select("xray_path, sputum_path")
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") {
        console.warn("Error fetching lab results:", error);
      } else if (data) {
        if (data.xray_path) downloadFile(data.xray_path, setXrayUrl);
        if (data.sputum_path) downloadFile(data.sputum_path, setSputumUrl);
      }

      setLoading(false);
    }

    if (userId) getLabResults();
  }, [userId]);

  // Download from storage
  async function downloadFile(path, setUrl) {
    try {
      const { data, error } = await supabase.storage
        .from("labresults")
        .download(path);
      if (error) throw error;

      const url = URL.createObjectURL(data);
      setUrl(url);
    } catch (err) {
      console.log("Error downloading file:", err.message);
    }
  }

  // Upload (patients only)
  async function uploadFile(event, type) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select a file to upload.");
      }

      const file = event.target.files[0];
      const fileExt = file.name.split(".").pop();
      const fileName = `${type}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("labresults")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const updates = {
        user_id: userId,
        updated_at: new Date(),
      };

      if (type === "xray") {
        updates.xray_path = filePath;
      } else {
        updates.sputum_path = filePath;
      }

      const { error: dbError } = await supabase
        .from("lab_results")
        .upsert(updates, { onConflict: "user_id" });

      if (dbError) throw dbError;

      if (type === "xray") {
        downloadFile(filePath, setXrayUrl);
      } else {
        downloadFile(filePath, setSputumUrl);
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4 md:p-6 py-4 md:py-8">
      <div className="w-full max-w-2xl p-4 md:p-6 bg-white rounded-2xl shadow-md space-y-4 md:space-y-6">
        <h2 className="text-xl md:text-2xl font-semibold text-center text-green-600">
          Lab Results
        </h2>

        {loading ? (
          <p className="text-center text-xs md:text-sm text-gray-500">Loading...</p>
        ) : (
          <>
            {/* X-ray Section */}
            <div className="space-y-2 md:space-y-3">
              <h3 className="text-base md:text-lg font-medium text-green-600">X-ray Result</h3>
              {xrayUrl ? (
                <>
                  <img
                    src={xrayUrl}
                    alt="X-ray Result"
                    className="w-full max-h-80 object-contain rounded-lg border"
                  />
                  {role === "doctor" && (
                    <a
                      href={xrayUrl}
                      download="xray-result.png"
                      className="block text-center font-medium bg-blue-600 text-white py-2 px-3 md:px-4 rounded-md hover:bg-blue-700 text-sm md:text-base"
                    >
                      Download X-ray
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs md:text-sm text-gray-500 italic">No X-ray uploaded yet.</p>
              )}
              {role === "patient" && (
                <label className="block w-full text-center font-medium bg-green-600 text-white py-2 px-3 md:px-4 rounded-md cursor-pointer hover:bg-green-700 text-sm md:text-base">
                  {uploading ? "Uploading..." : "Upload X-ray"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadFile(e, "xray")}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {/* Sputum Section */}
            <div className="space-y-2 md:space-y-3">
              <h3 className="text-base md:text-lg font-medium text-green-600">Sputum Result</h3>
              {sputumUrl ? (
                <>
                  <img
                    src={sputumUrl}
                    alt="Sputum Result"
                    className="w-full max-h-80 object-contain rounded-lg border"
                  />
                  {role === "doctor" && (
                    <a
                      href={sputumUrl}
                      download="sputum-result.png"
                      className="block text-center font-medium bg-blue-600 text-white py-2 px-3 md:px-4 rounded-md hover:bg-blue-700 text-sm md:text-base"
                    >
                      Download Sputum
                    </a>
                  )}
                </>
              ) : (
                <p className="text-xs md:text-sm text-gray-500 italic">No sputum uploaded yet.</p>
              )}
              {role === "patient" && (
                <label className="block w-full text-center font-medium bg-green-600 text-white py-2 px-3 md:px-4 rounded-md cursor-pointer hover:bg-green-700 text-sm md:text-base">
                  {uploading ? "Uploading..." : "Upload Sputum"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => uploadFile(e, "sputum")}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}