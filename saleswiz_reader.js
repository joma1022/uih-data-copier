(function () {
    console.log("SalesWiz Reader v2.2 Running...");

    let dealId = "";
    let companyName = "";
    let durationText = "0 Month";
    let dealType = "";
    let ownerName = "";

    let dealIdElement = document.querySelector(".deal-id");
    if (dealIdElement) dealId = dealIdElement.innerText.replace(/[^0-9]/g, "");

    let companyIcon =
        document.querySelector("img[src*='icon_company_info']") ||
        document.querySelector("img[alt='company icon']");

    if (companyIcon && companyIcon.nextElementSibling) {
        companyName = companyIcon.nextElementSibling.innerText.trim();
    }

    let allTitles = document.querySelectorAll(".field-title");
    allTitles.forEach((t) => {
        let val = t.nextElementSibling;
        if (!val) return;

        let k = t.innerText.trim();
        let v = val.innerText.trim();

        if (k === "Service Duration") durationText = v;
        if (k === "Deal Type") dealType = v;
        if (k === "Owner") ownerName = v;
    });

    let contractPeriod = durationText.split(" ")[0].trim();

    chrome.storage.local.set(
        {
            dealData: {
                id: dealId,
                company: companyName,
                period: contractPeriod,
                type: dealType,
                owner: ownerName
            }
        },
        function () {
            window.open("https://costsheet.uih.co.th/CreateDoc.aspx", "_blank");
        }
    );
})();